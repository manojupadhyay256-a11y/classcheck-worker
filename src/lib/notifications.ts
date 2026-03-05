import { sql } from './db';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { getMessagingInstance, VAPID_KEY } from '../firebase';
import { getToken } from 'firebase/messaging';
// Pusher removed in favor of FCM

export interface Notification {
    id: string;
    sender_id: string | null;
    recipient_id: string;
    title: string;
    message: string;
    type: 'announcement' | 'private_message' | 'system';
    priority: 'normal' | 'high' | 'urgent';
    is_read: boolean;
    created_at: string;
    sender_name?: string;
}

export const notificationService = {
    async send({
        senderId,
        recipientId,
        title,
        message,
        type = 'private_message',
        priority = 'normal'
    }: {
        senderId: string | null;
        recipientId: string;
        title: string;
        message: string;
        type?: Notification['type'];
        priority?: Notification['priority'];
    }) {
        // 2. Async Stability: DB Insert happens FIRST with 'pending' status for the worker
        const result = await sql`
            INSERT INTO notifications (sender_id, recipient_id, title, message, type, priority, status)
            VALUES (${senderId}, ${recipientId}, ${title}, ${message}, ${type}, ${priority}, 'pending')
            RETURNING *
        `;

        return result;
    },

    async fetchByRecipient(recipientId: string) {
        return await sql`
            SELECT n.*, COALESCE(p.full_name, s.student_name, 'System') as sender_name
            FROM public.notifications n
            LEFT JOIN public.profiles p ON n.sender_id = p.id
            LEFT JOIN public.students s ON n.sender_id = s.id
            WHERE n.recipient_id = ${recipientId}
            ORDER BY n.created_at DESC
        `;
    },

    async getUnreadCount(recipientId: string) {
        const result = await sql`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE recipient_id = ${recipientId} AND is_read = false
        `;
        return parseInt(result[0].count);
    },

    async markAsRead(notificationId: string) {
        return await sql`
            UPDATE notifications 
            SET is_read = true 
            WHERE id = ${notificationId}
        `;
    },

    async markAllAsRead(recipientId: string) {
        return await sql`
            UPDATE notifications 
            SET is_read = true 
            WHERE recipient_id = ${recipientId}
        `;
    },

    async broadcastToRole(senderId: string, role: string, title: string, message: string) {
        const recipients = await sql`
            SELECT id FROM profiles WHERE role = ${role}
        `;

        const promises = recipients.map(r =>
            this.send({
                senderId,
                recipientId: r.id,
                title,
                message,
                type: 'announcement',
                priority: 'normal'
            })
        );

        return Promise.all(promises);
    },

    async messageClass(senderId: string, classId: string, title: string, message: string) {
        const recipients = await sql`
            SELECT id FROM public.students WHERE class_id = ${classId}
        `;

        const promises = recipients.map(r =>
            this.send({
                senderId,
                recipientId: r.id,
                title,
                message,
                type: 'announcement',
                priority: 'normal'
            })
        );

        return Promise.all(promises);
    },

    async broadcastToUsers(senderId: string | null, recipientIds: string[], title: string, message: string, type: Notification['type'] = 'private_message') {
        const promises = recipientIds.map(id =>
            this.send({
                senderId,
                recipientId: id,
                title,
                message,
                type,
                priority: 'normal'
            })
        );

        return Promise.all(promises);
    },

    async registerPushToken(userId: string, role: 'teacher' | 'student' | 'admin' | 'principal') {
        // Fire and forget to avoid blocking main thread
        this._registerPushTokenInternal(userId, role).catch(err => {
            console.error('[NotificationService] registerPushToken background error:', err);
        });
    },

    async _registerPushTokenInternal(userId: string, role: 'teacher' | 'student' | 'admin' | 'principal') {
        try {
            console.log(`[NotificationService] Registering push token for ${role}: ${userId}`);

            const info = await Device.getInfo();
            let token = '';

            if (info.platform === 'android' || info.platform === 'ios') {
                // 1. Mobile Registration
                const status = await PushNotifications.checkPermissions();
                if (status.receive === 'prompt' || status.receive === 'denied') {
                    const newStatus = await PushNotifications.requestPermissions();
                    if (newStatus.receive !== 'granted') {
                        console.log('[NotificationService] Push permission not granted on mobile');
                        return;
                    }
                }

                // Reliability: Add a one-time listener directly here to catch the registration token
                const handler = await PushNotifications.addListener('registration', async ({ value: pushToken }) => {
                    console.log('[NotificationService] Mobile registration successful, saving token');
                    await this._saveTokenToDb(userId, role, pushToken);
                    handler.remove(); // Cleanup after first success
                });

                // Trigger registration
                await PushNotifications.register();
                return;
            } else {
                // 2. Web Registration
                if (!('Notification' in window)) {
                    console.log('[NotificationService] Desktop notifications not supported');
                    return;
                }

                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const messagingInstance = await getMessagingInstance();
                    if (!messagingInstance) {
                        console.warn('[NotificationService] Messaging not available, skipping web token');
                        return;
                    }
                    try {
                        token = await getToken(messagingInstance, {
                            vapidKey: VAPID_KEY
                        });
                    } catch (tokenErr) {
                        console.error('[NotificationService] getToken failed:', tokenErr);
                    }
                }
            }

            if (token) {
                await this._saveTokenToDb(userId, role, token);
            }
        } catch (e) {
            console.error('[NotificationService] Global registerPushToken failure:', e);
        }
    },

    /** Helper function to save FCM token to the correct table */
    async _saveTokenToDb(userId: string, role: string, token: string) {
        try {
            console.log(`[NotificationService] Saving token to DB for ${role}: ${userId}`);

            // Check if column exists first (safety check)
            const columnCheck = await sql`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = ${role === 'student' ? 'students' : 'profiles'} 
                AND column_name = 'fcm_token'
                LIMIT 1
            `;

            if (columnCheck.length === 0) {
                console.warn(`[NotificationService] fcm_token column missing in ${role === 'student' ? 'students' : 'profiles'}`);
                return;
            }

            if (role === 'student') {
                await sql`UPDATE public.students SET fcm_token = ${token} WHERE id = ${userId}`;
            } else {
                await sql`
                    UPDATE public.profiles
                    SET fcm_token = ${token}
                    WHERE id = ${userId}
                `;
            }
            console.log(`[NotificationService] FCM token successfully saved for ${role}`);
        } catch (err) {
            console.error('[NotificationService] Failed to save FCM token to DB:', err);
        }
    }
};
