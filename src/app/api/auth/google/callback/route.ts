import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Tell Next.js this route uses dynamic rendering (needs request.url)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    console.log('✅ Gmail OAuth Success!');
    console.log('Access Token:', tokens.access_token?.substring(0, 50) + '...');
    console.log('Refresh Token:', tokens.refresh_token?.substring(0, 50) + '...');

    // For now, just show the tokens (in production, save to database)
    return NextResponse.json({
      success: true,
      message: 'Gmail connected successfully!',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
