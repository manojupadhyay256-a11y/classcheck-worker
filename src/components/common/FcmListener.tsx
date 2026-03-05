import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getMessagingInstance } from '../../firebase';


/**
 * FcmListener Component
 * Replaces RealtimeListener for FCM/Firebase support.
 * Listens for push notifications received while the app is in the foreground.
 */
export const FcmListener = () => {
    const { profile } = useAuthStore();
    const { fetchUnreadCount, fetchNotifications } = useNotificationStore();

    useEffect(() => {
        if (!profile?.id) return;

        let pushReceivedListener: any;
        let pushActionPerformedListener: any;

        const setupListeners = async () => {
            // Check if we are on a native platform (iOS/Android)
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                console.log('[FcmListener] Initializing native listeners...');
                try {
                    pushReceivedListener = await PushNotifications.addListener(
                        'pushNotificationReceived',
                        async (notification) => {
                            console.log('[FcmListener] Native push received:', notification);
                            handleNotification(notification.title || 'New Message', notification.body || '');
                        }
                    );

                    pushActionPerformedListener = await PushNotifications.addListener(
                        'pushNotificationActionPerformed',
                        async (notification) => {
                            console.log('[FcmListener] Native push action:', notification);
                            window.location.hash = '/notifications';
                            refreshData();
                        }
                    );
                } catch (e) {
                    console.error('[FcmListener] Native listener setup failed:', e);
                }
            } else {
                // Web Platform - Use Firebase Messaging
                console.log('[FcmListener] Initializing web listeners...');
                try {
                    const messaging = await getMessagingInstance();
                    if (!messaging) {
                        console.log('[FcmListener] Firebase Messaging not available on this browser');
                        return;
                    }

                    // Import precisely what we need from the SDK
                    const { onMessage } = await import('firebase/messaging');

                    // Standard Firebase Web SDK listener
                    const unsubscribe = onMessage(messaging, (payload) => {
                        console.log('[FcmListener] Web push received in foreground:', payload);
                        const { title, body } = payload.notification || {};
                        handleNotification(title || 'New Message', body || '');
                    });

                    // Store unsubscribe function for cleanup
                    pushReceivedListener = { remove: unsubscribe };
                } catch (e) {
                    console.warn('[FcmListener] Web listener setup failed:', e);
                }
            }
        };

        const handleNotification = async (title: string, body: string) => {
            // 1. Trigger Sonner toast (All platforms)
            toast(title, {
                description: body,
                action: {
                    label: 'View',
                    onClick: () => {
                        window.location.hash = '/notifications';
                    }
                },
            });

            // 2. Native Mobile Features
            if (Capacitor.isNativePlatform()) {
                try {
                    // Trigger Haptic Vibration
                    await Haptics.notification({ type: NotificationType.Success });

                    // Trigger System-Level Local Notification (Foreground only)
                    // This ensures the user sees an alert even if they are currently in the app
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title,
                                body,
                                id: Math.floor(Math.random() * 1000000),
                                schedule: { at: new Date(Date.now() + 50) },
                                sound: 'default',
                                actionTypeId: '',
                                extra: null
                            }
                        ]
                    });
                } catch (e) {
                    console.warn('[FcmListener] Native effects failed:', e);
                }
            }

            // 3. Update store state
            refreshData();
        };

        const refreshData = () => {
            if (profile?.id) {
                fetchUnreadCount(profile.id);
                fetchNotifications(profile.id);
            }
        };

        setupListeners();

        return () => {
            console.log('[FcmListener] Removing listeners');
            if (pushReceivedListener) pushReceivedListener.remove();
            if (pushActionPerformedListener) pushActionPerformedListener.remove();
        };
    }, [profile?.id, fetchUnreadCount, fetchNotifications]);

    return null;
};
