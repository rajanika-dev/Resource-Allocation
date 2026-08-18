import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { resolve } from "node:path";
import postgres from "postgres";
import * as schema from "./schema";

config({ path: resolve(process.cwd(), "../../.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

export const queryClient = postgres(databaseUrl);
export const db = drizzle(queryClient, { schema });
