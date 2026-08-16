# RealtorAI – Email Automation Service

AI-powered email automation for real estate agents. Process property inquiries, generate personalized replies with Claude, and close more deals.

## 🚀 Features

- **Gmail Integration**: Auto-fetch and process property inquiries from agent inboxes
- **AI Reply Generation**: Generate 3 personalized reply variants with Claude 3.5 Sonnet
- **Agent Review Dashboard**: Approve/edit/send replies in seconds
- **Property Context**: Pull property details to personalize responses
- **Usage Tracking**: Monitor emails processed, costs, and ROI
- **Stripe Billing**: $800-$1,500/month subscription model

## 📋 Tech Stack

- **Backend**: Next.js 14 + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **AI**: Anthropic Claude API
- **Email**: Gmail API OAuth 2.0
- **Payments**: Stripe
- **Deployment**: Vercel + Railway

## 🛠️ Setup

### 1. Prerequisites

```bash
node >= 18.17
npm or pnpm
PostgreSQL database
```

### 2. Clone & Install

```bash
git clone https://github.com/yourusername/realtor-ai.git
cd realtor-ai-starter
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

**Required credentials:**
- `ANTHROPIC_API_KEY` – Get from [Anthropic Dashboard](https://console.anthropic.com)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` – Create OAuth app in [Google Cloud Console](https://console.cloud.google.com)
- `DATABASE_URL` – PostgreSQL connection string
- `STRIPE_SECRET_KEY` – Get from [Stripe Dashboard](https://dashboard.stripe.com)

### 4. Database Setup

```bash
# Create tables
npm run db:migrate

# (Optional) View database
npm run db:studio
```

### 5. Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Set Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID & Secret to `.env.local`

### 6. Development Server

```bash
npm run dev
# Open http://localhost:3000
```

## 📚 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── auth/          # OAuth flows
│   │   ├── emails/        # Email processing
│   │   ├── drafts/        # Reply drafts
│   │   └── webhooks/      # Stripe/Gmail webhooks
│   ├── dashboard/         # Agent dashboard
│   └── layout.tsx         # Root layout
├── db/
│   ├── schema.ts          # Drizzle ORM tables
│   └── index.ts           # DB connection
├── lib/
│   ├── gmail.ts           # Gmail API wrapper
│   ├── claude.ts          # Claude API integration
│   ├── stripe.ts          # Stripe helpers
│   └── auth.ts            # NextAuth config
└── components/            # React components
    ├── EmailInbox.tsx
    ├── DraftReviewModal.tsx
    └── DashboardLayout.tsx
```

## 🔄 Core Workflows

### 1. Email Processing Pipeline

```
Gmail → Fetch emails → Extract metadata (Claude) → Generate replies (Claude)
→ Store drafts → Agent reviews → Approve → Send reply → Track metrics
```

### 2. Reply Generation

- Fetch 3 variants of personalized reply
- Agent selects favorite or edits
- One-click send via Gmail API
- Cost tracked ($0.01-$0.03 per email)

### 3. Billing Workflow

- Monthly subscription via Stripe
- Usage-based pricing tier (# emails/month)
- Auto-scale as agent grows

## 📊 Database Schema

### Key Tables

**agents**
- Email, name, Google OAuth tokens
- Subscription status, billing info
- Preferences (tone, timezone)

**emailInquiries**
- Raw email metadata + body
- Extracted property address & buyer intent
- Processing status

**draftReplies**
- AI-generated reply variants
- Agent review status
- Costs & token usage

**sentEmails**
- Sent reply history
- Open/reply tracking
- Gmail message IDs

## 🚀 Deployment

### Option 1: Vercel (Recommended)

```bash
vercel
# Follow prompts, connect to GitHub
```

Environment variables are imported from `.env.local`.

### Option 2: Railway

```bash
railway init
railway up
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npm run type-check
```

## 📈 Metrics & Analytics

Track in dashboard:
- **Emails/week**: Volume processed
- **Reply generation time**: P50, P95
- **Cost/email**: Trend tracking
- **Agent satisfaction**: 5-star rating on variants
- **ROI**: Hours saved × agent hourly rate

## 🔐 Security

- OAuth 2.0 for Gmail auth (never store passwords)
- Encrypted storage of access tokens
- GDPR: Auto-delete email content after 30 days
- Stripe PCI compliance for billing
- Rate limiting on API endpoints

## 📝 API Endpoints

### Email Processing
- `POST /api/emails/process?agentId=123` – Process pending emails
- `GET /api/emails?agentId=123` – List inquiries
- `POST /api/emails/:id/drafts` – Generate reply variants

### Draft Management
- `GET /api/drafts?agentId=123` – List pending reviews
- `PATCH /api/drafts/:id/approve` – Approve & send
- `PATCH /api/drafts/:id/edit` – Submit edits + regenerate

### Stripe Webhooks
- `POST /api/webhooks/stripe` – Billing events

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## 📄 License

MIT License – see LICENSE file

## 🆘 Support

- **Docs**: [Implementation Plan](../RealtorAI_Implementation_Plan.md)
- **Email**: support@realtorai.com
- **Discord**: [Join community](https://discord.gg/realtorai)

## 🎯 Next Steps

1. **Validate PMF**: Call 5 real estate agents, run 2-week free trials
2. **Build dashboard**: Email inbox, draft reviews, analytics
3. **Launch marketing**: Direct outreach + real estate partnerships
4. **Iterate**: Gather feedback, add auto-send & lead scoring features

---

Built with ❤️ for real estate agents. Questions? Reach out to support@realtorai.com
