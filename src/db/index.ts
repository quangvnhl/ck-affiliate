import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lấy connection string từ biến môi trường
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Tạo postgres client
// Disable prefetch vì Neon không hỗ trợ
const client = postgres(connectionString, {
  prepare: false,
});

// Export drizzle instance với schema
export const db = drizzle(client, { schema });

// Export type cho db instance
export type Database = typeof db;
