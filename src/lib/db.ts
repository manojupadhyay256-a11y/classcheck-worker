import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL, { disableWarningInBrowsers: true });

export { sql };
