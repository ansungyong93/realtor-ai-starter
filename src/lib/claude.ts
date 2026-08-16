import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface PropertyContext {
  address: string;
  price?: number;
  beds?: number;
  baths?: number;
  squareFeet?: number;
  description?: string;
}

export interface EmailReplyRequest {
  prospectEmail: string;
  prospectName: string;
  incomingMessage: string;
  propertyAddress: string;
  propertyContext: PropertyContext;
  agentName: string;
  tone: "professional" | "friendly" | "formal";
  systemPrompt?: string;
}

export interface ReplyVariant {
  text: string;
  score: number; // Quality score 0-100
  tone: "professional" | "friendly" | "formal";
}

/**
 * Generate personalized email reply variants using Claude
 */
export async function generateReplyVariants(
  request: EmailReplyRequest,
  numVariants: number = 3
): Promise<{
  variants: ReplyVariant[];
  tokensUsed: number;
  costUsd: number;
}> {
  const systemPrompt =
    request.systemPrompt ||
    `You are an expert real estate assistant helping agents respond to property inquiries. Your job is to generate personalized, professional email replies that:
1. Address the prospect by name
2. Reference their specific interest (the property or neighborhood)
3. Provide relevant property details that answer their likely questions
4. Call to action: schedule a viewing or chat
5. Keep it concise (100-150 words)
6. Use the tone: ${request.tone}
7. Include the agent name in the signature

CRITICAL: Generate ONLY the email body text. No "Subject:" line, no extra formatting.`;

  const userPrompt = `
Generate ${numVariants} variations of a professional email reply to this property inquiry:

PROSPECT EMAIL:
${request.incomingMessage}

PROPERTY DETAILS:
- Address: ${request.propertyContext.address}
${request.propertyContext.price ? `- Price: $${request.propertyContext.price.toLocaleString()}` : ""}
${request.propertyContext.beds ? `- Bedrooms: ${request.propertyContext.beds}` : ""}
${request.propertyContext.baths ? `- Bathrooms: ${request.propertyContext.baths}` : ""}
${request.propertyContext.squareFeet ? `- Square Feet: ${request.propertyContext.squareFeet.toLocaleString()}` : ""}
${request.propertyContext.description ? `- Description: ${request.propertyContext.description}` : ""}

AGENT NAME: ${request.agentName}
PROSPECT NAME: ${request.prospectName}

Generate ${numVariants} DIFFERENT email body variations separated by "---VARIANT_BREAK---".
Each should have a distinct approach while being professional and genuine.
After the text, rate it 1-10 for quality on this line: QUALITY_SCORE: [number]`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse variants
    const variants = parseVariants(content.text, request.tone);

    // Calculate cost (using Sonnet pricing: $3/M input, $15/M output tokens)
    const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
    const outputCost = (response.usage.output_tokens / 1_000_000) * 15;
    const costUsd = inputCost + outputCost;

    return {
      variants,
      tokensUsed: response.usage.output_tokens,
      costUsd: Math.round(costUsd * 10000) / 10000, // Round to 4 decimals
    };
  } catch (error) {
    console.error("Claude API error:", error);
    throw new Error(`Failed to generate reply variants: ${(error as Error).message}`);
  }
}

/**
 * Parse Claude's response into variant objects
 */
function parseVariants(
  text: string,
  tone: "professional" | "friendly" | "formal"
): ReplyVariant[] {
  const sections = text.split("---VARIANT_BREAK---");

  return sections
    .map((section) => {
      const lines = section.trim().split("\n");
      let qualityScore = 75; // Default score

      // Look for quality score line
      const scoreLine = lines.find((l) => l.includes("QUALITY_SCORE:"));
      if (scoreLine) {
        const match = scoreLine.match(/QUALITY_SCORE:\s*(\d+)/);
        if (match) {
          qualityScore = Math.min(100, Math.max(1, parseInt(match[1])));
        }
      }

      // Remove score line from text
      const bodyLines = lines.filter((l) => !l.includes("QUALITY_SCORE:"));
      const bodyText = bodyLines.join("\n").trim();

      if (!bodyText) return null;

      return {
        text: bodyText,
        score: qualityScore,
        tone,
      };
    })
    .filter((v) => v !== null) as ReplyVariant[];
}

/**
 * Refine a reply based on agent feedback
 */
export async function refineReply(
  originalReply: string,
  feedback: string,
  propertyContext: PropertyContext,
  agentName: string
): Promise<{
  refinedText: string;
  tokensUsed: number;
  costUsd: number;
}> {
  const userPrompt = `
You're helping refine a real estate inquiry response email.

ORIGINAL REPLY:
${originalReply}

AGENT FEEDBACK:
${feedback}

PROPERTY: ${propertyContext.address}

Please generate ONE refined version of the email that incorporates the agent's feedback while maintaining professionalism and personality.`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022", // Use cheaper Haiku for refinement
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const outputCost = (response.usage.output_tokens / 1_000_000) * 0.8; // Haiku output = $0.80/M

    return {
      refinedText: content.text.trim(),
      tokensUsed: response.usage.output_tokens,
      costUsd: Math.round(outputCost * 10000) / 10000,
    };
  } catch (error) {
    console.error("Refinement error:", error);
    throw error;
  }
}

/**
 * Extract intent and property details from inquiry email using Claude
 */
export async function extractInquiryMetadata(emailBody: string): Promise<{
  propertyAddress: string | null;
  buyerIntent: "inquiry" | "offer" | "viewing" | "general";
  extractedMetadata: Record<string, any>;
  tokensUsed: number;
}> {
  const userPrompt = `
Extract the following from this property inquiry email:
1. Property address (if mentioned)
2. Buyer intent (inquiry, offer, viewing request, or general interest)
3. Any other relevant info (price point, timeline, property type preference)

Email:
${emailBody}

Respond in JSON format:
{
  "propertyAddress": "address or null",
  "buyerIntent": "inquiry|offer|viewing|general",
  "metadata": { "key": "value" }
}`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const parsed = JSON.parse(content.text);

    return {
      propertyAddress: parsed.propertyAddress,
      buyerIntent: parsed.buyerIntent || "inquiry",
      extractedMetadata: parsed.metadata || {},
      tokensUsed: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      propertyAddress: null,
      buyerIntent: "inquiry",
      extractedMetadata: {},
      tokensUsed: 0,
    };
  }
}
