import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { runYoloInference, getSignLanguageClasses } from "./yoloInference";
import * as db from "./db";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

// Simple in-memory user storage (for demo purposes)
// In production, this should be in a database
const users = new Map<string, { id: string; email: string; password: string; name: string }>();

// Add demo user
users.set('demo@example.com', {
  id: '1',
  email: 'demo@example.com',
  password: 'demo123', // In production, this should be hashed
  name: 'Demo User'
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = users.get(input.email);
        
        if (!user || user.password !== input.password) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Email hoặc mật khẩu không đúng',
          });
        }

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, user.id, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        };
      }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        // Check if user already exists
        if (users.has(input.email)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email đã được sử dụng',
          });
        }

        // Create new user
        const newUser = {
          id: String(users.size + 1),
          email: input.email,
          password: input.password, // In production, hash this
          name: input.name,
        };

        users.set(input.email, newUser);

        return {
          success: true,
          message: 'Đăng ký thành công! Vui lòng đăng nhập.',
        };
      }),
  }),
  // Sign Language Detection
  detection: router({
    // Run YOLO inference on an image
    detect: publicProcedure
      .input(z.object({
        image: z.string(), // base64 encoded image
        confidence: z.number().min(0).max(1).default(0.5),
      }))
      .mutation(async ({ input }) => {
        const result = await runYoloInference(input.image, input.confidence);
        return result;
      }),
    
    // Get all available sign classes
    getClasses: publicProcedure.query(() => {
      return getSignLanguageClasses();
    }),
  }),
  // Vocabulary management
  vocabulary: router({
    // Get all sign vocabulary
    list: publicProcedure.query(async () => {
      return await db.getAllSignVocabulary();
    }),
    
    // Get vocabulary by class ID
    getByClassId: publicProcedure
      .input(z.object({ classId: z.string() }))
      .query(async ({ input }) => {
        return await db.getSignVocabularyByClassId(input.classId);
      }),
  }),
  // User progress tracking
  progress: router({
    // Get user's progress
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserProgress(ctx.user.id);
    }),
    
    // Get progress for specific sign
    getForSign: protectedProcedure
      .input(z.object({ signId: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.getUserProgressForSign(ctx.user.id, input.signId);
      }),
    
    // Update progress after practice
    update: protectedProcedure
      .input(z.object({
        signId: z.string(),
        success: z.boolean(),
        proficiencyLevel: z.enum(["learning", "practicing", "mastered"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserProgressForSign(ctx.user.id, input.signId);
        
        const attempts = existing ? String(Number(existing.attempts) + 1) : "1";
        const successCount = existing 
          ? String(Number(existing.successCount) + (input.success ? 1 : 0))
          : input.success ? "1" : "0";
        
        await db.upsertUserProgress({
          id: existing?.id || randomUUID(),
          userId: ctx.user.id,
          signId: input.signId,
          attempts,
          successCount,
          proficiencyLevel: input.proficiencyLevel || existing?.proficiencyLevel || "learning",
          lastPracticed: new Date(),
        });
        
        return { success: true };
      }),
  }),
  // Practice sessions
  session: router({
    // Create new practice session
    create: protectedProcedure
      .input(z.object({
        mode: z.enum(["realtime", "practice"]),
        signId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = randomUUID();
        await db.createPracticeSession({
          id: sessionId,
          userId: ctx.user.id,
          mode: input.mode,
          signId: input.signId,
          startedAt: new Date(),
        });
        return { sessionId };
      }),
    
    // Complete practice session
    complete: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        duration: z.string(),
        detectionCount: z.string(),
        successRate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updatePracticeSession(input.sessionId, {
          duration: input.duration,
          detectionCount: input.detectionCount,
          successRate: input.successRate,
          completedAt: new Date(),
        });
        return { success: true };
      }),
    
    // Get user's session history
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSessions(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;

