import Link from 'next/link';

export default function Home() {
  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h1>🤖 RealtorAI</h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
        Automate property inquiry emails with AI
      </p>

      <div
        style={{
          padding: '30px',
          backgroundColor: '#f0f4f8',
          borderRadius: '8px',
          border: '1px solid #ddd',
          marginBottom: '30px',
        }}
      >
        <h2>Welcome to RealtorAI</h2>
        <p>
          Connect your Gmail account to automatically generate and send intelligent
          responses to property inquiries using Claude AI.
        </p>

        <Link href="/dashboard">
          <button
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginTop: '20px',
            }}
          >
            Go to Dashboard →
          </button>
        </Link>
      </div>

      <div style={{ marginTop: '40px', color: '#666' }}>
        <p>✨ Features:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>🔐 Secure Gmail OAuth 2.0 integration</li>
          <li>🤖 AI-powered email generation with Claude</li>
          <li>📧 Automatic property inquiry detection</li>
          <li>💰 Save hours on email responses</li>
        </ul>
      </div>
    </div>
  );
}
