
const { Client } = require('pg');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
// You need to place your service-account.json in the root or set GOOGLE_APPLICATION_CREDENTIALS
try {
    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        console.log('[Worker] Using service-account.json for Firebase Admin');
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.log('[Worker] Using default application credentials for Firebase Admin');
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }
    console.log('[Worker] Firebase Admin initialized');
} catch (error) {
    console.error('[Worker] Firebase Admin initialization failed:', error);
    console.log('[Worker] Ensure you have set GOOGLE_APPLICATION_CREDENTIALS or provided service-account.json');
    process.exit(1);
}

const dbConfig = {
    // Neon uses VITE_DATABASE_URL in this project
    // Connection pooling breaks LISTEN/NOTIFY, so we remove '-pooler' from the URL to get a direct connection
    connectionString: (process.env.VITE_DATABASE_URL || process.env.DATABASE_URL)?.replace('-pooler', ''),
    ssl: {
        rejectUnauthorized: false
    }
};

async function startWorker() {
    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('[Worker] Connected to database');

        // Listen for the 'new_notification' channel
        await client.query('LISTEN new_notification');
        console.log('[Worker] Listening for new notifications...');

        client.on('notification', async (msg) => {
            if (msg.channel === 'new_notification') {
                const notification = JSON.parse(msg.payload);
                console.log('[Worker] Received new notification:', notification.id);
                await handleNotification(notification);
            }
        });

        client.on('error', (err) => {
            console.error('[Worker] Database client error:', err);
            process.exit(1);
        });

    } catch (error) {
        console.error('[Worker] Failed to start worker:', error);
        process.exit(1);
    }
}

async function handleNotification(notification) {
    const { recipient_id, title, message, sender_id } = notification;

    try {
        const dbClient = new Client(dbConfig);
        await dbClient.connect();

        // 1. Find the recipient's FCM token from profiles or students
        const res = await dbClient.query(`
            SELECT fcm_token, 'profile' as source FROM profiles WHERE id = $1
            UNION ALL
            SELECT fcm_token, 'student' as source FROM students WHERE id = $1
            LIMIT 1
        `, [recipient_id]);

        const fcmToken = res.rows[0]?.fcm_token;
        const source = res.rows[0]?.source;

        if (!fcmToken) {
            console.log(`[Worker] No FCM token found for user ${recipient_id}, skipping push.`);
            await dbClient.end();
            return;
        }

        // 2. Find sender name
        const senderRes = await dbClient.query(`
            SELECT COALESCE(p.full_name, s.student_name, 'System') as name
            FROM profiles p
            FULL OUTER JOIN students s ON p.id = s.id
            WHERE p.id = $1 OR s.id = $1
            LIMIT 1
        `, [sender_id]);

        const senderName = senderRes.rows[0]?.name || 'System';
        await dbClient.end();

        // 3. Send via Firebase
        const payload = {
            token: fcmToken,
            notification: {
                title: title || `New Message from ${senderName}`,
                body: message
            },
            data: {
                notificationId: notification.id.toString(),
                senderId: sender_id ? sender_id.toString() : '',
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true
                }
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: title || `New Message from ${senderName}`,
                            body: message
                        },
                        sound: 'default'
                    }
                }
            }
        };

        const response = await admin.messaging().send(payload);
        console.log('[Worker] Successfully sent message:', response);

    } catch (error) {
        console.error('[Worker] Error handling notification:', error);
    }
}

startWorker();
