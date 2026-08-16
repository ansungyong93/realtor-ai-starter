import { google } from "googleapis";
import { AgentRow } from "@/db/schema";

const gmail = google.gmail("v1");

/**
 * Initialize Gmail API OAuth client for an agent
 */
export function getGmailClient(agent: AgentRow) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
  );

  if (!agent.googleAccessToken) {
    throw new Error("Agent does not have Gmail access token");
  }

  oauth2Client.setCredentials({
    access_token: agent.googleAccessToken,
    refresh_token: agent.googleRefreshToken,
    expiry_date: agent.googleExpiry?.getTime(),
  });

  return oauth2Client;
}

/**
 * Watch for new emails in agent's inquiry label
 */
export async function setupGmailWatch(
  agentId: number,
  oauth2Client: any,
  labelName: string = "Inquiries"
) {
  try {
    // Get label ID
    const labelsResponse = await gmail.users.labels.list({
      userId: "me",
      auth: oauth2Client,
    });

    const label = labelsResponse.data.labels?.find(
      (l) => l.name?.toLowerCase() === labelName.toLowerCase()
    );

    if (!label?.id) {
      console.warn(`Label "${labelName}" not found. Creating...`);
      // Auto-create label if not found
      const createResponse = await gmail.users.labels.create({
        userId: "me",
        auth: oauth2Client,
        requestBody: {
          name: labelName,
          labelListVisibility: "labelShow",
          messageListVisibility: "show",
        },
      });
      return createResponse.data.id;
    }

    // Set up watch (once per agent)
    await gmail.users.watch({
      userId: "me",
      auth: oauth2Client,
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/gmail-${agentId}`,
        labelIds: [label.id],
      },
    });

    return label.id;
  } catch (error) {
    console.error("Gmail watch setup failed:", error);
    throw error;
  }
}

/**
 * Get recent emails from a label
 */
export async function getEmails(
  oauth2Client: any,
  labelId: string,
  maxResults: number = 10
) {
  try {
    const messagesResponse = await gmail.users.messages.list({
      userId: "me",
      auth: oauth2Client,
      labelIds: [labelId],
      maxResults,
      q: "is:unread", // Only unread emails
    });

    const messageIds = messagesResponse.data.messages?.map((m) => m.id) || [];

    // Fetch full message content
    const messages = await Promise.all(
      messageIds.map((id) =>
        gmail.users.messages.get({
          userId: "me",
          auth: oauth2Client,
          id: id!,
          format: "full",
        })
      )
    );

    return messages.map((msg) => parseGmailMessage(msg.data));
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    throw error;
  }
}

/**
 * Parse Gmail message into structured format
 */
export function parseGmailMessage(message: any) {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

  const from = getHeader("from") || "";
  const subject = getHeader("subject") || "";
  const timestamp = parseInt(message.internalDate || "0");

  // Extract body (handles multipart)
  let body = "";
  if (message.payload?.parts) {
    const textPart = message.payload.parts.find(
      (p: any) => p.mimeType === "text/plain"
    );
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  } else if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  }

  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    from,
    subject,
    body,
    receivedAt: new Date(timestamp),
  };
}

/**
 * Send an email reply via Gmail API
 */
export async function sendReply(
  oauth2Client: any,
  originalMessageId: string,
  to: string,
  subject: string,
  body: string
) {
  try {
    const message = createRawMessage({
      to,
      subject: `Re: ${subject}`,
      body,
      inReplyTo: originalMessageId,
    });

    const response = await gmail.users.messages.send({
      userId: "me",
      auth: oauth2Client,
      requestBody: {
        raw: message,
      },
    });

    return {
      success: true,
      gmailMessageId: response.data.id,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to send reply:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Create a raw MIME message for Gmail send
 */
function createRawMessage({
  to,
  subject,
  body,
  inReplyTo,
}: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}) {
  const from = process.env.SENDGRID_FROM_EMAIL || "noreply@realtorai.com";
  const boundary = `boundary_${Date.now()}`;

  let msg = `From: ${from}\r\n`;
  msg += `To: ${to}\r\n`;
  msg += `Subject: ${subject}\r\n`;
  if (inReplyTo) {
    msg += `In-Reply-To: <${inReplyTo}@mail.gmail.com>\r\n`;
    msg += `References: <${inReplyTo}@mail.gmail.com>\r\n`;
  }
  msg += `MIME-Version: 1.0\r\n`;
  msg += `Content-Type: text/plain; charset=UTF-8\r\n`;
  msg += `\r\n${body}`;

  return Buffer.from(msg).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Mark email as read
 */
export async function markEmailAsRead(oauth2Client: any, messageId: string) {
  try {
    await gmail.users.messages.modify({
      userId: "me",
      auth: oauth2Client,
      id: messageId,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });
  } catch (error) {
    console.error("Failed to mark email as read:", error);
  }
}
