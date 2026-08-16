import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple test endpoint - just returns a success message
 * This tests that the API route system is working
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Email processing API is working!',
    nextSteps: [
      '1. Send yourself a test email with subject: "Property inquiry: 123 Main Street"',
      '2. Label it with "Inquiries" in Gmail',
      '3. Run: curl http://localhost:3000/api/emails/test',
      '4. Check PowerShell logs for email processing details',
    ],
    stats: {
      emailsProcessed: 0,
      emailsDrafted: 0,
      avgProcessTime: '2-3 seconds per email',
      costPerEmail: '$0.01-$0.03',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: 'Email test received',
      received: {
        timestamp: new Date().toISOString(),
        data: body,
      },
      status: 'Email would be processed here',
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
