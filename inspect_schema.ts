import { sql } from './src/lib/db.ts';

async function main() {
    try {
        const result = await sql\`
            SELECT 
                conname as name, 
                pg_get_constraintdef(c.oid) as definition
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'notifications';
        \`;
        console.log('Constraints for notifications:');
        console.table(result);

        const columns = await sql\`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notifications';
        \`;
        console.log('Columns for notifications:');
        console.table(columns);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

main();
