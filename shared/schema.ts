import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// ✅ حل مشكلة ZodObject + TypeScript 5.4+
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}) as unknown as z.ZodTypeAny;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
