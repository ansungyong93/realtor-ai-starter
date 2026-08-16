export default function Home() {
  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🤖 RealtorAI</h1>
      <p>AI-powered email automation for real estate agents</p>
      <a href="/dashboard" style={{ fontSize: '18px', color: '#4285F4', textDecoration: 'none' }}>
        Go to Dashboard →
      </a>
      <hr style={{ margin: '40px 0' }} />
      <p style={{ color: '#666' }}>✨ Features:</p>
      <ul style={{ textAlign: 'center', listStyle: 'none' }}>
        <li>🔐 Secure Gmail OAuth 2.0</li>
        <li>🤖 AI-powered responses</li>
        <li>📧 Auto-detect inquiries</li>
      </ul>
    </main>
  );
}
