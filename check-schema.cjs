import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.VITE_DATABASE_URL
});

async function main() {
    await client.connect();
    try {
        const res = await client.query(\`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'notifications';
        \`);
        console.table(res.rows);
        
        const constraints = await client.query(\`
            SELECT
                conname as constraint_name,
                contype as constraint_type,
                pg_get_constraintdef(c.oid) as definition
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'notifications';
        \`);
        console.table(constraints.rows);
    } finally {
        await client.end();
    }
}
main().catch(console.error);
