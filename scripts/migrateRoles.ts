import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/Classcheck Turso/ClassCheck/.env') });

const client = createClient({
    url: process.env.VITE_TURSO_DATABASE_URL as string,
    authToken: process.env.VITE_TURSO_AUTH_TOKEN as string,
});

async function run() {
    try {
        console.log('Adding is_office to profiles...');
        await client.execute('ALTER TABLE profiles ADD COLUMN is_office BOOLEAN DEFAULT 0');
    } catch(e) { console.log('is_office may already exist:', e.message); }
    
    try {
        console.log('Adding is_librarian to profiles...');
        await client.execute('ALTER TABLE profiles ADD COLUMN is_librarian BOOLEAN DEFAULT 0');
    } catch(e) { console.log('is_librarian may already exist:', e.message); }

    try {
        console.log('Creating books table...');
        await client.execute(`
            CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY, 
                title TEXT NOT NULL, 
                author TEXT NOT NULL, 
                isbn TEXT, 
                total_copies INTEGER DEFAULT 1, 
                available_copies INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch(e) { console.error('Failed to create books table:', e.message); }

    try {
        console.log('Creating book_issues table...');
        await client.execute(`
            CREATE TABLE IF NOT EXISTS book_issues (
                id TEXT PRIMARY KEY, 
                book_id TEXT NOT NULL REFERENCES books(id), 
                student_id TEXT NOT NULL REFERENCES students(id), 
                issue_date TEXT NOT NULL, 
                due_date TEXT NOT NULL, 
                return_date TEXT, 
                status TEXT DEFAULT 'issued',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch(e) { console.error('Failed to create book_issues table:', e.message); }
    
    console.log('Done!');
}
run();
