import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// Check if database is available
export const isDatabaseAvailable = !!process.env.DATABASE_URL;

// Only set up database if DATABASE_URL is available
export let pool = null;
export let db = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool });
    console.log('✅ Database connection established');
  } catch (error) {
    console.warn('⚠️ Database connection failed, falling back to file-based storage:', error.message);
  }
} else {
  console.log('📁 Running without database - using file-based storage');
}