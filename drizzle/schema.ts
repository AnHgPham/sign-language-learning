import { mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sign language vocabulary table
 * Stores all available sign language words/phrases
 */
export const signVocabulary = mysqlTable("sign_vocabulary", {
  id: varchar("id", { length: 64 }).primaryKey(),
  classId: varchar("classId", { length: 32 }).notNull().unique(),
  className: varchar("className", { length: 100 }).notNull(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type SignVocabulary = typeof signVocabulary.$inferSelect;
export type InsertSignVocabulary = typeof signVocabulary.$inferInsert;

/**
 * User progress tracking
 * Tracks which signs each user has learned and their proficiency
 */
export const userProgress = mysqlTable("user_progress", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  signId: varchar("signId", { length: 64 }).notNull(),
  attempts: varchar("attempts", { length: 10 }).default("0").notNull(),
  successCount: varchar("successCount", { length: 10 }).default("0").notNull(),
  lastPracticed: timestamp("lastPracticed").defaultNow(),
  proficiencyLevel: mysqlEnum("proficiencyLevel", ["learning", "practicing", "mastered"]).default("learning").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

/**
 * Practice sessions
 * Records of user practice sessions for analytics
 */
export const practiceSessions = mysqlTable("practice_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  mode: mysqlEnum("mode", ["realtime", "practice"]).notNull(),
  signId: varchar("signId", { length: 64 }),
  duration: varchar("duration", { length: 10 }),
  detectionCount: varchar("detectionCount", { length: 10 }).default("0"),
  successRate: varchar("successRate", { length: 10 }),
  startedAt: timestamp("startedAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = typeof practiceSessions.$inferInsert;
