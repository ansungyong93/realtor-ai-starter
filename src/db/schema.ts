import {
  pgTable,
  text,
  timestamp,
  numeric,
  json,
  varchar,
  integer,
  boolean,
  serial,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// AGENTS (Main SaaS customers)
// ============================================================================
export const agents = pgTable(
  "agents",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),

    // Auth
    googleAccessToken: text("google_access_token"),
    googleRefreshToken: text("google_refresh_token"),
    googleExpiry: timestamp("google_expiry"),

    // Preferences
    tone: varchar("tone", { length: 50 }).default("professional"), // professional, friendly, formal
    timezone: varchar("timezone", { length: 50 }).default("America/Toronto"),

    // Billing
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    subscriptionStatus: varchar("subscription_status", { length: 50 }).default("trial"), // trial, active, past_due, canceled
    monthlyEmails: integer("monthly_emails").default(0),

    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailIdx: index("agents_email_idx").on(table.email),
    stripeIdx: index("agents_stripe_idx").on(table.stripeCustomerId),
  })
);

// ============================================================================
// EMAIL INQUIRIES (Incoming emails from prospects)
// ============================================================================
export const emailInquiries = pgTable(
  "email_inquiries",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),

    // Gmail metadata
    gmailMessageId: varchar("gmail_message_id", { length: 255 }).notNull(),
    gmailThreadId: varchar("gmail_thread_id", { length: 255 }).notNull(),
    from: varchar("from", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body").notNull(),

    // Extracted data
    propertyAddress: varchar("property_address", { length: 500 }),
    propertyType: varchar("property_type", { length: 100 }), // house, condo, etc.
    buyerIntent: varchar("buyer_intent", { length: 100 }), // inquiry, offer, viewing
    extractedMetadata: json("extracted_metadata"), // JSON with price, beds, baths, etc.

    // Processing
    status: varchar("status", { length: 50 }).default("pending"), // pending, drafted, replied, skipped
    processedAt: timestamp("processed_at"),

    // Email received time
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    agentIdx: index("inquiries_agent_idx").on(table.agentId),
    gmailIdx: index("inquiries_gmail_idx").on(table.gmailMessageId),
    statusIdx: index("inquiries_status_idx").on(table.status),
  })
);

// ============================================================================
// DRAFT REPLIES (AI-generated responses pending agent review)
// ============================================================================
export const draftReplies = pgTable(
  "draft_replies",
  {
    id: serial("id").primaryKey(),
    inquiryId: integer("inquiry_id")
      .references(() => emailInquiries.id, { onDelete: "cascade" })
      .notNull(),

    // Reply variants (store multiple for A/B testing)
    variants: json("variants").notNull(), // Array of {text, score, tone}
    selectedVariantIndex: integer("selected_variant_index").default(0),

    // Status
    status: varchar("status", { length: 50 }).default("pending_review"), // pending_review, approved, rejected, sent
    reviewedAt: timestamp("reviewed_at"),
    sentAt: timestamp("sent_at"),

    // Metadata
    tokensUsed: integer("tokens_used"),
    costUsd: numeric("cost_usd", { precision: 6, scale: 4 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    inquiryIdx: index("drafts_inquiry_idx").on(table.inquiryId),
    statusIdx: index("drafts_status_idx").on(table.status),
  })
);

// ============================================================================
// AGENT TEMPLATES (Custom email templates/preferences)
// ============================================================================
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),

    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Template content
    systemPrompt: text("system_prompt").notNull(), // Custom instructions for Claude
    closeStatements: json("close_statements"), // Array of closing lines agent prefers

    // Usage
    isDefault: boolean("is_default").default(false),
    enabled: boolean("enabled").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    agentIdx: index("templates_agent_idx").on(table.agentId),
  })
);

// ============================================================================
// SENT EMAILS (History of sent replies)
// ============================================================================
export const sentEmails = pgTable(
  "sent_emails",
  {
    id: serial("id").primaryKey(),
    draftId: integer("draft_id")
      .references(() => draftReplies.id, { onDelete: "set null" }),
    inquiryId: integer("inquiry_id")
      .references(() => emailInquiries.id, { onDelete: "cascade" })
      .notNull(),

    // Sent info
    to: varchar("to", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body").notNull(),

    // Delivery tracking
    gmailMessageId: varchar("gmail_message_id", { length: 255 }),
    status: varchar("status", { length: 50 }).default("sent"), // sent, failed, bounced
    errorMessage: text("error_message"),

    // Tracking
    openedAt: timestamp("opened_at"),
    repliedAt: timestamp("replied_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    inquiryIdx: index("sent_inquiry_idx").on(table.inquiryId),
    statusIdx: index("sent_status_idx").on(table.status),
  })
);

// ============================================================================
// AGENT PROPERTIES (Listings that agents own/manage)
// ============================================================================
export const agentProperties = pgTable(
  "agent_properties",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),

    // Property info
    address: varchar("address", { length: 500 }).notNull(),
    propertyType: varchar("property_type", { length: 100 }),
    price: numeric("price", { precision: 12, scale: 2 }),
    bedrooms: integer("bedrooms"),
    bathrooms: numeric("bathrooms", { precision: 3, scale: 1 }),
    squareFeet: integer("square_feet"),

    // External IDs
    mlsId: varchar("mls_id", { length: 50 }),
    zillowId: varchar("zillow_id", { length: 100 }),

    // Details
    description: text("description"),
    imageUrl: varchar("image_url", { length: 500 }),

    // Status
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    agentIdx: index("properties_agent_idx").on(table.agentId),
    mlsIdx: index("properties_mls_idx").on(table.mlsId),
  })
);

// ============================================================================
// ANALYTICS / USAGE LOGS
// ============================================================================
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),

    // Event type
    eventType: varchar("event_type", { length: 50 }).notNull(), // email_processed, reply_generated, reply_sent

    // Metadata
    metadata: json("metadata"), // Flexible JSON for event-specific data

    // Costs
    tokensUsed: integer("tokens_used"),
    costUsd: numeric("cost_usd", { precision: 6, scale: 4 }),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    agentIdx: index("logs_agent_idx").on(table.agentId),
    typeIdx: index("logs_type_idx").on(table.eventType),
  })
);

// ============================================================================
// RELATIONS (for Drizzle type inference)
// ============================================================================
export const agentsRelations = relations(agents, ({ many }) => ({
  inquiries: many(emailInquiries),
  templates: many(emailTemplates),
  properties: many(agentProperties),
  usageLogs: many(usageLogs),
}));

export const inquiriesRelations = relations(emailInquiries, ({ one, many }) => ({
  agent: one(agents, {
    fields: [emailInquiries.agentId],
    references: [agents.id],
  }),
  draftReply: many(draftReplies),
  sentEmail: many(sentEmails),
}));

export const draftRepliesRelations = relations(draftReplies, ({ one }) => ({
  inquiry: one(emailInquiries, {
    fields: [draftReplies.inquiryId],
    references: [emailInquiries.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS (for use in application code)
// ============================================================================
export type AgentRow = typeof agents.$inferSelect;
export type EmailInquiryRow = typeof emailInquiries.$inferSelect;
export type DraftReplyRow = typeof draftReplies.$inferSelect;
export type SentEmailRow = typeof sentEmails.$inferSelect;
export type AgentPropertyRow = typeof agentProperties.$inferSelect;
export type EmailTemplateRow = typeof emailTemplates.$inferSelect;
export type UsageLogRow = typeof usageLogs.$inferSelect;
