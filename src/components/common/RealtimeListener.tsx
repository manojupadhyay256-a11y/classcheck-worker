import { useEffect } from 'react';
import { pusher } from '../../lib/pusher';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Device } from '@capacitor/device';

/**
 * RealtimeListener Component
 * Subscribes to Pusher channels and listens for new notifications.
 * Displays a toast using 'sonner' when a message is received.
 */
export const RealtimeListener = () => {
    const { profile } = useAuthStore();
    const { fetchUnreadCount, fetchNotifications } = useNotificationStore();

    useEffect(() => {
        if (!profile?.id) return;

        // 1. Connection Efficiency: Manually connect when the listener is mounted
        pusher.connect();

        // 2. Private Channel Subscription
        // Naming convention: private-[role]-[id] as requested
        const channelName = `private-${profile.role}-${profile.id}`;
        const channel = pusher.subscribe(channelName);

        console.log(`[RealtimeListener] Subscribed to ${channelName}`);

        channel.bind('new-notification', async (data: any) => {
            console.log('[RealtimeListener] New notification received:', data);

            const senderName = data.senderName || 'Someone';
            const displayTitle = `New Message from ${senderName}`;
            const displayMessage = data.message;

            // 1. Trigger Sonner toast (In-App)
            toast(displayTitle, {
                description: displayMessage,
                action: {
                    label: 'View',
                    onClick: () => {
                        window.location.hash = '/notifications';
                    }
                },
            });

            // 2. Trigger Haptic Vibration
            try {
                await Haptics.notification({ type: NotificationType.Success });
            } catch (e) {
                console.warn('[RealtimeListener] Haptics failed:', e);
            }

            // 3. Trigger Local Notification (System-level)
            try {
                const info = await Device.getInfo();
                if (info.platform === 'android' || info.platform === 'ios') {
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: displayTitle,
                                body: displayMessage,
                                id: Math.floor(Math.random() * 100000),
                                schedule: { at: new Date(Date.now() + 100) }, // basically now
                                sound: 'default',
                                attachments: [],
                                actionTypeId: '',
                                extra: null
                            }
                        ]
                    });
                }
            } catch (e) {
                console.warn('[RealtimeListener] LocalNotifications failed:', e);
            }

            // Update store state
            fetchUnreadCount(profile.id);
            fetchNotifications(profile.id);
        });

        // 3. Efficiency: Disconnect when user closes app or leaves tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                pusher.connect();
            } else {
                pusher.disconnect();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            console.log(`[RealtimeListener] Unsubscribing from ${channelName} and disconnecting`);
            channel.unbind_all();
            pusher.unsubscribe(channelName);
            pusher.disconnect();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [profile, fetchUnreadCount, fetchNotifications]);

    return null; // This component doesn't render anything
};
