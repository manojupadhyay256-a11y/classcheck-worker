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
        // 1. Insert into DB with default status
        const [inserted] = await sql`
            INSERT INTO notifications (sender_id, recipient_id, title, message, type, priority, status)
            VALUES (${senderId}, ${recipientId}, ${title}, ${message}, ${type}, ${priority}, 'pending')
            RETURNING *
        `;

        try {
            // 2. Fetch the recipient's FCM token
            const tokenRes = await sql`
                SELECT fcm_token FROM profiles WHERE id = ${recipientId}
                UNION ALL
                SELECT fcm_token FROM students WHERE id = ${recipientId}
                LIMIT 1
            `;

            const fcmToken = tokenRes[0]?.fcm_token;

            // 3. Send via Netlify function synchronously
            if (fcmToken) {
                fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: fcmToken,
                        title,
                        message,
                        data: {
                            notificationId: inserted.id.toString(),
                            senderId: senderId ? senderId.toString() : '',
                        }
                    })
                }).then(async (res) => {
                    if (res.ok) {
                        await sql`UPDATE notifications SET status = 'sent' WHERE id = ${inserted.id}`;
                    } else {
                        await sql`UPDATE notifications SET status = 'failed' WHERE id = ${inserted.id}`;
                    }
                }).catch(err => {
                    console.error('[NotificationService] Netlify function request error:', err);
                });
            } else {
                // No token found
                await sql`UPDATE notifications SET status = 'no_token' WHERE id = ${inserted.id}`;
            }
        } catch (err) {
            console.error('[NotificationService] Failed to process push:', err);
            await sql`UPDATE notifications SET status = 'failed' WHERE id = ${inserted.id}`;
        }

        return [inserted];
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
        // Return the promise so the UI can track progress/errors
        return this._registerPushTokenInternal(userId, role).catch(err => {
            console.error('[NotificationService] registerPushToken error:', err);
            throw err; // Re-throw to inform the caller
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
                if (permission !== 'granted') {
                    throw new Error('Notification permission denied by user or browser.');
                }

                const messagingInstance = await getMessagingInstance();
                if (!messagingInstance) {
                    throw new Error('Firebase Messaging is not supported on this browser or context (requires HTTPS).');
                }

                try {
                    console.log('[NotificationService] Requesting fresh FCM token with VAPID:', VAPID_KEY);
                    token = await getToken(messagingInstance, {
                        vapidKey: VAPID_KEY
                    });

                    if (!token) {
                        throw new Error('FCM returned an empty token.');
                    }
                    console.log('[NotificationService] Received fresh token:', token.substring(0, 10) + '...');
                } catch (tokenErr: any) {
                    console.error('[NotificationService] getToken failed:', tokenErr);
                    throw new Error(`FCM Token Error: ${tokenErr.message || 'Unknown error'}`);
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

            if (role === 'student') {
                await sql`UPDATE public.students SET fcm_token = ${token}, updated_at = NOW() WHERE id = ${userId}`;
            } else {
                await sql`
                    UPDATE public.profiles
                    SET fcm_token = ${token}, updated_at = NOW()
                    WHERE id = ${userId}
                `;
            }
            console.log(`[NotificationService] FCM token successfully saved for ${role}`);
        } catch (err: any) {
            console.error('[NotificationService] Failed to save FCM token to DB:', err);
            throw new Error(`Database sync failed: ${err.message || 'Unknown error'}`);
        }
    }
};
