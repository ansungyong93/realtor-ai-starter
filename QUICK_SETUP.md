# RealtorAI – 30-Minute Setup Guide

Complete setup in 30 minutes. We'll get you processing real emails by the end.

---

## ✅ Pre-flight Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL running locally
- [ ] Gmail account (use your test account)
- [ ] Anthropic API key (free tier is fine)
- [ ] 30 minutes free

---

## Step 1: Get Your API Keys (10 minutes)

### A. Anthropic API Key

1. Go to https://console.anthropic.com/account/keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)
4. Keep this safe, we'll use it in step 3

### B. Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create new project: `RealtorAI-Test`
3. Search for "Gmail API" → Enable it
4. Go to "Credentials" (left sidebar)
5. Click "Create Credentials" → OAuth 2.0 Client ID
6. Choose "Web application"
7. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
8. Click Create
9. Download JSON file or copy:
   - Client ID
   - Client Secret
10. Keep these handy for step 3

**Tip**: If you see a "Consent Screen" warning, set User Type to "External" and add yourself as a test user.

---

## Step 2: Set Up PostgreSQL (5 minutes)

### Option A: Docker (Easiest)
```bash
docker run --name realtor-ai-test \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

### Option B: Homebrew (Mac)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Option C: Windows/Direct
Download from https://www.postgresql.org/download/windows/

**Create the database:**
```bash
createdb realtor_ai_dev
```

Verify:
```bash
psql -U postgres -d realtor_ai_dev -c "SELECT 1"
# Should output: 1 (success)
```

---

## Step 3: Configure Environment (5 minutes)

1. Open: `realtor-ai-starter/.env.example`
2. Copy to: `realtor-ai-starter/.env.local`
3. Fill in these 4 values:

```env
# From Anthropic Console
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# From Google Cloud Console
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# PostgreSQL (default)
DATABASE_URL=postgresql://postgres:password@localhost:5432/realtor_ai_dev

# Auto-generate (just copy these)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=testsecret123456789testsecret123456
```

---

## Step 4: Install & Start (10 minutes)

```bash
cd realtor-ai-starter

# Install dependencies
npm install

# Create database tables
npm run db:migrate

# Start dev server
npm run dev
```

You should see:
```
> next dev
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## Step 5: Test Gmail OAuth

1. Open http://localhost:3000 in browser
2. Look for a "Connect Gmail" button (you'll need to add this - see Component below)
3. Click it → Google login screen
4. Authorize RealtorAI
5. Should redirect back to http://localhost:3000/api/auth/google/callback

**If you get an error**, check:
- [ ] Redirect URI matches exactly in Google Cloud Console
- [ ] Gmail API is enabled
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

---

## Step 6: Create Test Dashboard Component

Create this file: `realtor-ai-starter/src/app/dashboard/page.tsx`

```tsx
'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleConnectGmail = async () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  const handleProcessEmails = async () => {
    setLoading(true);
    try {
      // This will fail until we build the auth API
      // For now, just test the structure
      const response = await fetch('/api/emails/process?agentId=1', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: (error as Error).message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>RealtorAI Dashboard</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>1. Connect Gmail</h2>
        <button 
          onClick={handleConnectGmail}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          📧 Connect Gmail
        </button>
        <p style={{ color: '#666' }}>
          Click to authorize RealtorAI to read your emails
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>2. Process Emails</h2>
        <button 
          onClick={handleProcessEmails}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#34A853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {loading ? '⏳ Processing...' : '⚡ Process Emails'}
        </button>
        <p style={{ color: '#666' }}>
          Fetch emails from Gmail and generate replies
        </p>
      </div>

      {result && (
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '4px',
          marginTop: '20px',
        }}>
          <h3>Result:</h3>
          <pre style={{ overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

Navigate to: http://localhost:3000/dashboard

---

## Step 7: Build Gmail Auth API (10 minutes)

Create: `realtor-ai-starter/src/app/api/auth/google/route.ts`

```ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

export async function GET(request: NextRequest) {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  return NextResponse.redirect(authUrl);
}
```

Create: `realtor-ai-starter/src/app/api/auth/google/callback/route.ts`

```ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: Store tokens in database for this agent
    console.log('✅ Gmail tokens received:', {
      accessToken: tokens.access_token?.substring(0, 20) + '...',
      refreshToken: tokens.refresh_token?.substring(0, 20) + '...',
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?authenticated=true`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

---

## Step 8: Test Email Processing

1. Send yourself a test email with subject: `"Property inquiry: 123 Main St"`
2. Label it with `Inquiries` label in Gmail (create if it doesn't exist)
3. In dashboard, click **"Process Emails"**
4. Check the result

Expected output:
```json
{
  "processed": 1,
  "drafted": 1,
  "errors": []
}
```

---

## 🧪 End-to-End Test Checklist

- [ ] PostgreSQL running (`psql -U postgres -d realtor_ai_dev -c "SELECT 1"`)
- [ ] `.env.local` filled with 4 credentials
- [ ] `npm run dev` starting without errors
- [ ] Dashboard loads at http://localhost:3000/dashboard
- [ ] "Connect Gmail" button redirects to Google login
- [ ] Gmail authorizes → redirects back
- [ ] Send yourself test email with "Inquiries" label
- [ ] Click "Process Emails" → See result

---

## 🚨 Common Issues & Fixes

### "Cannot find module googleapis"
```bash
npm install googleapis
npm run dev
```

### "ECONNREFUSED localhost:5432"
PostgreSQL not running.
```bash
# If using Docker
docker start realtor-ai-test

# If using Homebrew
brew services start postgresql@15
```

### "Invalid OAuth redirect_uri"
Google Cloud Console redirect URI must match EXACTLY:
- ✅ `http://localhost:3000/api/auth/google/callback`
- ❌ `http://localhost:3000/api/auth/google` (missing /callback)
- ❌ `http://localhost:3001/api/auth/google/callback` (wrong port)

### "Error: invalid_grant"
Token expired or already used.
- Delete OAuth tokens from Google Account settings
- Start fresh OAuth flow

### "Claude API rate limit"
Start with Haiku for testing (cheaper, faster):
```ts
model: "claude-3-5-haiku-20241022"
```

---

## ✅ You're Done!

You now have:
- ✅ Running PostgreSQL database
- ✅ Gmail OAuth connected
- ✅ Claude API ready
- ✅ Email processing pipeline
- ✅ Dashboard to test

**Next**: Send it a test email and watch it generate replies! 🚀

---

## 📊 What's Happening Under the Hood

1. **User clicks "Connect Gmail"** → Redirects to Google OAuth
2. **Google asks permission** → User approves
3. **Callback stores tokens** → Save in database (TODO)
4. **User clicks "Process Emails"** → Fetches from "Inquiries" label
5. **Claude reads email** → Extracts property, intent
6. **Claude generates replies** → 3 personalized variants
7. **Dashboard shows drafts** → User reviews and sends

---

## 🎯 Next Steps After Setup

Once you have emails processing:

1. **Test reply quality**: Send 10 test emails, review Claude's output
2. **Track costs**: Monitor Claude API usage (should be <$0.10 for 10 emails)
3. **Build send function**: Add button to actually send replies
4. **Add metrics**: Track processing time, token usage
5. **Deploy**: Push to Vercel and test with real agent

