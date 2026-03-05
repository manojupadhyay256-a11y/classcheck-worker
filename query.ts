import { sql } from './src/lib/db.ts';

(async () => {
    try {
        const columns = await sql\`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'notifications'
        \`;
        console.table(columns);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
