import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines with actual newlines
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('[Firebase Admin] Initialized successfully');
    } catch (error) {
        console.error('[Firebase Admin] Initialization error:', error);
    }
}

export default async function (req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { token, title, message, data } = req.body;

        if (!token || !title || !message) {
            return res.status(400).json({ error: 'Missing required fields: token, title, or message' });
        }

        const payload = {
            token,
            notification: {
                title,
                body: message,
            },
            data: data || {},
            android: {
                priority: 'high' as const,
                notification: {
                    sound: 'default',
                    channelId: 'notifications',
                },
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                },
                notification: {
                    icon: '/dpsicon.png',
                    badge: '/dpsicon.png',
                },
            },
        };

        const response = await admin.messaging().send(payload);
        console.log('[FCM] Successfully sent message:', response);

        return res.status(200).json({ success: true, messageId: response });
    } catch (error: any) {
        console.error('[FCM] Error sending message:', error);
        return res.status(500).json({
            error: 'Failed to send notification',
            details: error.message
        });
    }
}
