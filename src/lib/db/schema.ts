import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- ENUMS ----------
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const trackTypeEnum = pgEnum("track_type", [
  "song",
  "beat",
  "vocal",
  "guitar",
]);
export const trackSourceEnum = pgEnum("track_source", [
  "uploaded",
  "ai_matched",
  "ai_standalone",
]);
export const matchStatusEnum = pgEnum("match_status", [
  "none",
  "pending",
  "generating",
  "completed",
  "failed",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "expired",
  "trialing",
]);

// ---------- USERS ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- PACKAGES ----------
export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthlyCents: integer("price_monthly_cents").notNull().default(0),
  uploadLimit: integer("upload_limit").notNull().default(10),
  aiMatchLimit: integer("ai_match_limit").notNull().default(0),
  aiStandaloneLimit: integer("ai_standalone_limit").notNull().default(0),
  playTimeLimitMins: integer("play_time_limit_mins").notNull().default(60),
  aiBiasPercent: integer("ai_bias_percent").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- SUBSCRIPTIONS ----------
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
});

// ---------- TRACKS ----------
export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: trackTypeEnum("type").notNull().default("song"),
  source: trackSourceEnum("source").notNull().default("uploaded"),
  fileUrl: text("file_url").notNull(),
  durationSeconds: real("duration_seconds"),
  bpm: real("bpm"),
  musicalKey: text("musical_key"),
  energyLevel: real("energy_level"),
  genreTags: text("genre_tags"),
  matchedTrackId: uuid("matched_track_id"),
  matchStatus: matchStatusEnum("match_status").notNull().default("none"),
  playCount: integer("play_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- AI GENERATION JOBS ----------
export const aiGenerationJobs = pgTable("ai_generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceTrackId: uuid("source_track_id"),
  resultTrackId: uuid("result_track_id"),
  kind: text("kind").notNull().default("standalone"),
  prompt: text("prompt").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  providerJobId: text("provider_job_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ---------- DJ SESSIONS ----------
export const djSessions = pgTable("dj_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("auto"),
  moodProfile: text("mood_profile"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  totalPlayTimeMins: real("total_play_time_mins").notNull().default(0),
});

export const sessionTracks = pgTable("session_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => djSessions.id, { onDelete: "cascade" }),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});

// ---------- USAGE LOGS ----------
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  amount: real("amount").notNull().default(1),
  periodKey: text("period_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- RELATIONS ----------
export const usersRelations = relations(users, ({ many }) => ({
  tracks: many(tracks),
  subscriptions: many(subscriptions),
  sessions: many(djSessions),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  package: one(packages, {
    fields: [subscriptions.packageId],
    references: [packages.id],
  }),
}));

export const tracksRelations = relations(tracks, ({ one }) => ({
  user: one(users, { fields: [tracks.userId], references: [users.id] }),
}));

export const djSessionsRelations = relations(djSessions, ({ one, many }) => ({
  user: one(users, { fields: [djSessions.userId], references: [users.id] }),
  sessionTracks: many(sessionTracks),
}));
