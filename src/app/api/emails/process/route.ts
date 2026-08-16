import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, emailInquiries, draftReplies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGmailClient, getEmails, setupGmailWatch, parseGmailMessage } from "@/lib/gmail";
import { generateReplyVariants, extractInquiryMetadata } from "@/lib/claude";
import { google } from "googleapis";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const gmail = google.gmail("v1");

/**
 * Process pending emails for an agent
 * POST /api/emails/process?agentId=123
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Get agent
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, parseInt(agentId)))
      .limit(1);

    if (!agent.length) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentRecord = agent[0];

    // Initialize Gmail client
    const oauth2Client = getGmailClient(agentRecord);

    // Get or create inquiry label
    const labelId = await setupGmailWatch(
      agentRecord.id,
      oauth2Client,
      "Inquiries"
    );

    if (!labelId) {
      return NextResponse.json({ error: "Failed to get Gmail label" }, { status: 500 });
    }

    // Fetch recent emails
    const emails = await getEmails(oauth2Client, labelId, 10);

    const results = {
      processed: 0,
      drafted: 0,
      errors: [] as string[],
    };

    for (const email of emails) {
      try {
        // Check if already processed
        const existing = await db
          .select()
          .from(emailInquiries)
          .where(eq(emailInquiries.gmailMessageId, email.gmailMessageId))
          .limit(1);

        if (existing.length) {
          continue; // Skip if already processed
        }

        // Extract metadata
        const { propertyAddress, buyerIntent, extractedMetadata } =
          await extractInquiryMetadata(email.body);

        // Store inquiry
        const [inquiry] = await db
          .insert(emailInquiries)
          .values({
            agentId: agentRecord.id,
            gmailMessageId: email.gmailMessageId,
            gmailThreadId: email.gmailThreadId,
            from: email.from,
            subject: email.subject,
            body: email.body,
            propertyAddress,
            buyerIntent,
            extractedMetadata,
            receivedAt: email.receivedAt,
            status: "drafted",
          })
          .returning();

        results.processed++;

        // Generate reply variants
        try {
          const variants = await generateReplyVariants({
            prospectEmail: email.from,
            prospectName: email.from.split("@")[0],
            incomingMessage: email.body,
            propertyAddress: propertyAddress || "Unknown",
            propertyContext: {
              address: propertyAddress || agentRecord.name,
              description: email.subject,
            },
            agentName: agentRecord.name,
            tone: (agentRecord.tone as "professional" | "friendly" | "formal") ||
              "professional",
          });

          // Store draft reply
          await db.insert(draftReplies).values({
            inquiryId: inquiry.id,
            variants: JSON.stringify(variants.variants),
            selectedVariantIndex: 0,
            status: "pending_review",
            tokensUsed: variants.tokensUsed,
            costUsd: variants.costUsd.toString(),
          } as any);

          results.drafted++;

          // Log usage
          const { usageLogs } = await import("@/db/schema");
          await db.insert(usageLogs).values({
            agentId: agentRecord.id,
            eventType: "reply_generated",
            tokensUsed: variants.tokensUsed,
            costUsd: variants.costUsd.toString(),
            metadata: JSON.stringify({
              inquiryId: inquiry.id,
              variants: variants.variants.length,
            }),
          } as any);
        } catch (generateError) {
          results.errors.push(
            `Failed to generate reply for ${email.from}: ${(generateError as Error).message}`
          );
        }
      } catch (emailError) {
        results.errors.push(
          `Failed to process email from ${email.from}: ${(emailError as Error).message}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Email processing error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Webhook handler for Gmail push notifications
 * POST /api/emails/process (without agentId)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify Pub/Sub message format
    if (!body.message?.data) {
      return NextResponse.json({ message: "Invalid message" }, { status: 400 });
    }

    // Decode Pub/Sub message
    const decodedMessage = JSON.parse(
      Buffer.from(body.message.data, "base64").toString()
    );

    const { historyId, emailAddress } = decodedMessage;

    // Find agent by email
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.email, emailAddress))
      .limit(1);

    if (!agent.length) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Trigger processing
    const processingUrl = new URL(
      `/api/emails/process?agentId=${agent[0].id}`,
      process.env.NEXTAUTH_URL
    );

    const response = await fetch(processingUrl.toString(), {
      method: "POST",
    });

    return NextResponse.json(
      { message: "Processing triggered", result: await response.json() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
