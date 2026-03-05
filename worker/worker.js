import admin from 'firebase-admin';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Initialize Database Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

/**
 * Polls the database for 'pending' notifications and sends them via FCM
 */
async function processNotifications() {
    const client = await pool.connect();
    try {
        // 1. Fetch pending notifications
        const res = await client.query(
            "SELECT id, recipient_id, title, message FROM notifications WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50"
        );

        if (res.rows.length === 0) return;

        console.log(`[Worker] Processing ${res.rows.length} pending notifications...`);

        for (const row of res.rows) {
            const { id, recipient_id, title, message } = row;

            try {
                // 2. Lookup FCM token for the recipient
                const tokenRes = await client.query(
                    `SELECT fcm_token FROM profiles WHERE id = $1
           UNION ALL
           SELECT fcm_token FROM students WHERE id = $1
           LIMIT 1`,
                    [recipient_id]
                );

                const fcmToken = tokenRes.rows[0]?.fcm_token;

                if (!fcmToken) {
                    console.log(`[Worker] No FCM token found for user ${recipient_id}. Skipping push.`);
                    await client.query("UPDATE notifications SET status = 'no_token' WHERE id = $1", [id]);
                    continue;
                }

                // 3. Construct and send FCM message
                const payload = {
                    token: fcmToken,
                    notification: {
                        title: title,
                        body: message,
                    },
                    android: {
                        priority: 'high',
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

                const fcmResponse = await admin.messaging().send(payload);
                console.log(`[Worker] Successfully sent notification ${id}:`, fcmResponse);

                // 4. Update status to 'sent'
                await client.query("UPDATE notifications SET status = 'sent' WHERE id = $1", [id]);

            } catch (err) {
                console.error(`[Worker] Failed to process notification ${id}:`, err.message);
                // Mark as failed so we don't loop indefinitely
                await client.query("UPDATE notifications SET status = 'failed' WHERE id = $1", [id]);
            }
        }
    } catch (err) {
        console.error('[Worker] Fatal polling error:', err);
    } finally {
        client.release();
    }
}

// Start polling every 5 seconds
console.log('[Worker] Push Notification Worker started (Polling every 5s)...');
setInterval(processNotifications, 5000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Worker] SIGTERM received. Closing pool...');
    pool.end();
    process.exit(0);
});
