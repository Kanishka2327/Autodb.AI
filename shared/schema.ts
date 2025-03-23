import { pgTable, text, serial, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Project schema to store database designs
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  schema: text("schema").notNull(),
  dbType: text("db_type").notNull().default("PostgreSQL"),
  diagram: json("diagram").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Define the insert schema for projects
export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  prompt: true,
  schema: true,
  dbType: true,
  diagram: true,
});

// Keep existing users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
