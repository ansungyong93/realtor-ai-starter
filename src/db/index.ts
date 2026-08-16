import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let cachedDb: any = null;

// Lazy initialize database connection at runtime, not build time
export function getDb() {
  if (!cachedDb) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    const client = postgres(connectionString);
    cachedDb = drizzle(client);
  }

  return cachedDb;
}

// Export for backwards compatibility
export const db = new Proxy(
  {},
  {
    get: (_, prop) => {
      return getDb()[prop as any];
    },
  }
) as any;
