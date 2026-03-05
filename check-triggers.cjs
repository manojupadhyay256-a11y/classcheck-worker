const { Client } = require('pg');
// Removed -pooler from the host domain
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_4KoAH3XbOuxJ@ep-crimson-star-a1aym14b.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require' });

client.connect().then(() => {
    console.log('[Test] Connected with direct connection');
    client.query('LISTEN new_notification');

    client.on('notification', (msg) => {
        console.log('[Test] Received notification!', msg.payload);
        process.exit(0);
    });

    // Trigger it explicitly
    client.query(`
        INSERT INTO notifications (sender_id, recipient_id, title, message, type)
        VALUES ('15f1178f-9d65-441c-92c3-0bb46af58bca', '15f1178f-9d65-441c-92c3-0bb46af58bca', 'Direct Push', 'Checking without pooler', 'system');
    `);
}).catch(err => { console.error(err); process.exit(1); });
