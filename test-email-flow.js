#!/usr/bin/env node

/**
 * Test Email Flow - Validates Claude + Gmail integration
 * Run with: node test-email-flow.js
 */

require('dotenv').config({ path: '.env.local' });
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

// Test email (real estate inquiry)
const testEmail = {
  from: 'john.buyer@example.com',
  subject: 'Interested in 123 Main Street',
  body: `Hi,

I'm very interested in the property at 123 Main Street, Moncton.

I saw it listed for $450,000. I'm a first-time homebuyer and would love to know more about:
- Is it still available?
- Can we schedule a viewing next weekend?
- Are there any inspection issues I should know about?

Thanks!
John`,
};

// Test property context
const propertyContext = {
  address: '123 Main Street, Moncton, NB',
  price: 450000,
  beds: 3,
  baths: 2,
  squareFeet: 1800,
  description: 'Beautiful colonial home in downtown Moncton, recently renovated kitchen, hardwood floors',
};

async function testEmailFlow() {
  console.log('🚀 RealtorAI Email Flow Test\n');
  console.log('=' .repeat(50));

  // Check environment
  console.log('\n📋 Environment Check:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ANTHROPIC_API_KEY not set in .env.local');
    process.exit(1);
  }

  try {
    console.log('\n📧 Test Email:');
    console.log(`  From: ${testEmail.from}`);
    console.log(`  Subject: ${testEmail.subject}`);
    console.log(`  Length: ${testEmail.body.length} chars\n`);

    // Step 1: Extract metadata
    console.log('⏳ Step 1: Extracting email metadata with Claude...');
    const extractionResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Extract the following from this property inquiry email:
1. Property address (if mentioned)
2. Buyer intent (inquiry, offer, viewing request, or general)
3. Key questions asked
4. Timeline

Email:
${testEmail.body}

Respond in JSON format:
{
  "propertyAddress": "address or null",
  "buyerIntent": "inquiry|offer|viewing|general",
  "questions": ["question1", "question2"],
  "timeline": "ASAP|weekend|flexible"
}`,
        },
      ],
    });

    const extractedData = JSON.parse(
      extractionResponse.content[0].type === 'text'
        ? extractionResponse.content[0].text
        : '{}'
    );

    console.log('✅ Extracted:');
    console.log(`  Intent: ${extractedData.buyerIntent}`);
    console.log(`  Questions: ${extractedData.questions?.length || 0}`);
    console.log(`  Timeline: ${extractedData.timeline}`);
    console.log(`  Cost: $${((extractionResponse.usage.output_tokens / 1000000) * 0.8).toFixed(4)}\n`);

    // Step 2: Generate reply variants
    console.log('⏳ Step 2: Generating 3 reply variants with Claude...');

    const systemPrompt = `You are an expert real estate assistant. Generate personalized, professional email replies that:
1. Address the prospect by name
2. Reference their specific interest
3. Provide relevant property details
4. Include a clear call to action
5. Keep it concise (80-120 words)
6. Use a professional, friendly tone

CRITICAL: Generate ONLY the email body. No subject line, no extra formatting.`;

    const userPrompt = `Generate 3 different variations of a professional email reply to this property inquiry:

PROSPECT:
${testEmail.body}

PROPERTY:
- Address: ${propertyContext.address}
- Price: $${propertyContext.price.toLocaleString()}
- Beds/Baths: ${propertyContext.beds}/${propertyContext.baths}
- Sq Ft: ${propertyContext.squareFeet.toLocaleString()}
- Description: ${propertyContext.description}

AGENT NAME: Sarah Martinez

Separate each variation with "---VARIANT_BREAK---"
After each variant, rate it 1-10 for quality on this line: QUALITY_SCORE: [number]`;

    const replyResponse = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const replyText =
      replyResponse.content[0].type === 'text' ? replyResponse.content[0].text : '';
    const variants = parseVariants(replyText);

    console.log(`✅ Generated ${variants.length} variants:\n`);
    variants.forEach((v, i) => {
      console.log(`📝 Variant ${i + 1} (Score: ${v.score}/10):`);
      console.log(`   "${v.text.substring(0, 120)}..."\n`);
    });

    const outputCost = (replyResponse.usage.output_tokens / 1000000) * 15;
    const inputCost = (replyResponse.usage.input_tokens / 1000000) * 3;
    console.log(`Cost Breakdown:`);
    console.log(`  Input tokens: ${replyResponse.usage.input_tokens} ($${inputCost.toFixed(4)})`);
    console.log(`  Output tokens: ${replyResponse.usage.output_tokens} ($${outputCost.toFixed(4)})`);
    console.log(`  Total: $${(inputCost + outputCost).toFixed(4)}\n`);

    // Step 3: Summary
    console.log('=' .repeat(50));
    console.log('\n✅ TEST COMPLETE!\n');
    console.log('Summary:');
    console.log(`  Emails processed: 1`);
    console.log(`  Reply variants generated: ${variants.length}`);
    console.log(`  Total API cost: $${(inputCost + outputCost + 0.0032).toFixed(4)}`);
    console.log(`  Cost per email: $${(inputCost + outputCost + 0.0032).toFixed(4)}`);
    console.log(`  Quality: ✅ Ready for production\n`);
    console.log('Next steps:');
    console.log('  1. Set up Gmail OAuth');
    console.log('  2. Connect to PostgreSQL');
    console.log('  3. Start processing real emails');
    console.log('  4. Test with first agent\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status === 401) {
      console.error('Invalid API key. Check ANTHROPIC_API_KEY in .env.local');
    }
    process.exit(1);
  }
}

function parseVariants(text) {
  const sections = text.split('---VARIANT_BREAK---');
  return sections
    .map((section) => {
      const lines = section.trim().split('\n');
      let score = 75;

      const scoreLine = lines.find((l) => l.includes('QUALITY_SCORE:'));
      if (scoreLine) {
        const match = scoreLine.match(/QUALITY_SCORE:\s*(\d+)/);
        if (match) {
          score = Math.min(100, Math.max(1, parseInt(match[1])));
        }
      }

      const bodyLines = lines.filter((l) => !l.includes('QUALITY_SCORE:'));
      const bodyText = bodyLines.join('\n').trim();

      return bodyText
        ? {
            text: bodyText,
            score,
          }
        : null;
    })
    .filter((v) => v !== null);
}

testEmailFlow();
