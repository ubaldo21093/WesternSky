import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if using Neon (contains neon.tech) or standard PostgreSQL (Docker)
const isNeon = process.env.DATABASE_URL.includes('neon.tech');

let db: ReturnType<typeof drizzle> | ReturnType<typeof drizzlePg>;
let pool: Pool | pg.Pool;

if (isNeon) {
  // Neon serverless uses WebSocket
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool as Pool, schema });
} else {
  // Standard PostgreSQL (Docker/local)
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg({ client: pool, schema });
}

export { db, pool };