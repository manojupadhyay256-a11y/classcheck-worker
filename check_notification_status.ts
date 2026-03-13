
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL!);

async function checkStatus() {
    try {
        const id = 'e98164e5-e9f9-4156-8434-fcbc210ff54d';
        console.log(`--- Checking status for notification ${id} ---`);
        const result = await sql`
            SELECT status, created_at FROM notifications WHERE id = ${id}
        `;

        if (result.length === 0) {
            console.log('Notification not found');
            return;
        }

        console.log('Current Status:', result[0].status);
        console.log('Created At:', result[0].created_at);

        if (result[0].status === 'pending') {
            console.log('Still pending. Worker might not be running or polling yet.');
        } else {
            console.log('Notification has been processed!');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

checkStatus();
