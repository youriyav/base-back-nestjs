import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Runs before any e2e test module loads (Jest `setupFiles`). Points the app
 * at the isolated `zoya_test` database instead of the real one — dotenv never
 * overrides an already-set env var, so once DB_NAME is set here,
 * ConfigModule's own later `dotenv.config()` (loading `.env`) cannot clobber
 * it. Every other var (DB_HOST, DB_USER, JWT_SECRET, etc.) still comes from
 * `.env` as usual — only DB_NAME is redirected.
 */
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
