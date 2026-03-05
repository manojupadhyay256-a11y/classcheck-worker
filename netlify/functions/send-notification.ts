import { Handler } from '@netlify/functions';
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

export const handler: Handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { token, title, message, data } = JSON.parse(event.body || '{}');

        if (!token || !title || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: token, title, or message' }),
            };
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

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, messageId: response }),
        };
    } catch (error: any) {
        console.error('[FCM] Error sending message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to send notification',
                details: error.message
            }),
        };
    }
};
