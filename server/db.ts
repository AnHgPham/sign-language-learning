import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  signVocabulary,
  SignVocabulary,
  InsertSignVocabulary,
  userProgress,
  UserProgress,
  InsertUserProgress,
  practiceSessions,
  PracticeSession,
  InsertPracticeSession
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Sign Vocabulary queries
export async function getAllSignVocabulary(): Promise<SignVocabulary[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(signVocabulary);
}

export async function getSignVocabularyByClassId(classId: string): Promise<SignVocabulary | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(signVocabulary).where(eq(signVocabulary.classId, classId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertSignVocabulary(sign: InsertSignVocabulary): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(signVocabulary).values(sign);
}

// User Progress queries
export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userProgress).where(eq(userProgress.userId, userId));
}

export async function getUserProgressForSign(userId: string, signId: string): Promise<UserProgress | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProgress)
    .where(and(
      eq(userProgress.userId, userId),
      eq(userProgress.signId, signId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserProgress(progress: InsertUserProgress): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(userProgress).values(progress).onDuplicateKeyUpdate({
    set: {
      attempts: progress.attempts,
      successCount: progress.successCount,
      lastPracticed: new Date(),
      proficiencyLevel: progress.proficiencyLevel,
    },
  });
}

// Practice Session queries
export async function createPracticeSession(session: InsertPracticeSession): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(practiceSessions).values(session);
}

export async function updatePracticeSession(
  sessionId: string,
  updates: Partial<PracticeSession>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(practiceSessions)
    .set(updates)
    .where(eq(practiceSessions.id, sessionId));
}

export async function getUserSessions(userId: string): Promise<PracticeSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId));
}
