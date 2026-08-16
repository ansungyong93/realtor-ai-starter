#!/usr/bin/env node

/**
 * Simple Claude API Test - No parsing, just raw output
 */

require('dotenv').config({ path: '.env.local' });
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaude() {
  console.log('🚀 Simple Claude Test\n');

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  console.log('✅ API Key: Set');
  console.log('');

  try {
    console.log('⏳ Calling Claude API...\n');

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a real estate assistant. Write a short, friendly email reply to this property inquiry:

"Hi, I'm interested in the property at 123 Main Street. Can you tell me more about it and schedule a viewing?"

Write ONLY the email body (no subject line). Keep it under 100 words.`,
        },
      ],
    });

    console.log('✅ SUCCESS! Claude responded:\n');
    console.log('---');
    console.log(response.content[0].text);
    console.log('---\n');

    console.log('📊 Stats:');
    console.log(`  Input tokens: ${response.usage.input_tokens}`);
    console.log(`  Output tokens: ${response.usage.output_tokens}`);
    console.log(`  Cost: $${((response.usage.output_tokens / 1000000) * 3).toFixed(4)}`);

    console.log('\n🎉 Claude API is working perfectly!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    process.exit(1);
  }
}

testClaude();
