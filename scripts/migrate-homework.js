import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Creating homework table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS homework (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
                subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
                date DATE NOT NULL,
                topic VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Successfully created homework table.');
    } catch (err) {
        console.error('Error creating homework table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
