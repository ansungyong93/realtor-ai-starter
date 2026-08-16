'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleConnectGmail = async () => {
    setLoading(true);
    window.location.href = '/api/auth/google';
  };

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1>🚀 RealtorAI Dashboard</h1>

      <div
        style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#f0f4f8',
          borderRadius: '8px',
          border: '1px solid #ddd',
        }}
      >
        <h2>Step 1: Connect Gmail</h2>
        <p>
          Click the button below to authorize RealtorAI to read and send emails
          from your Gmail account.
        </p>
        <button
          onClick={handleConnectGmail}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          {loading ? '⏳ Redirecting...' : '📧 Connect Gmail'}
        </button>
      </div>

      <div
        style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #ddd',
        }}
      >
        <h2>Step 2: Process Emails</h2>
        <p>
          After connecting Gmail, emails from your "Inquiries" label will be
          automatically processed. Claude will generate personalized replies.
        </p>
        <code
          style={{
            display: 'block',
            padding: '10px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginTop: '10px',
          }}
        >
          curl http://localhost:3000/api/emails/process?agentId=1
        </code>
      </div>

      <div
        style={{
          padding: '20px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #ddd',
        }}
      >
        <h2>Step 3: View Results</h2>
        <p>Check your browser console or logs for generated email replies.</p>
      </div>

      {result && (
        <div
          style={{
            marginTop: '30px',
            padding: '20px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}
        >
          <h3>Result:</h3>
          <pre
            style={{
              overflow: 'auto',
              backgroundColor: '#fff',
              padding: '10px',
              borderRadius: '4px',
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
// Test redeploy
