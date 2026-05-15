'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PendingApproval() {
  const router = useRouter();
  const [pubkey, setPubkey] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user_pubkey') : null;
    setPubkey(stored);
  }, []);

  return (
    <div className="auth-root">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-body" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <div className="auth-logo-title">
              <span style={{ color: '#2962ff' }}>ATLAS</span>
              <span>-QUANT</span>
            </div>
            <div className="auth-logo-sub">PENDING WALLET APPROVAL</div>
          </div>

          {/* Spinner */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 18px' }}>
            <div style={{ position: 'relative', width: 76, height: 76 }}>
              <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(41,98,255,0.18)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#2962ff', borderRadius: '50%', animation: 'spin 1.4s linear infinite' }} />
              <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          </div>

          <p style={{ color: '#b6bcc8', fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>
            Your wallet signature was verified. You are waiting for the platform
            <strong style={{ color: '#fff' }}> Master account</strong> to approve your public key
            on Solana Devnet before trading data unlocks.
          </p>

          <div
            style={{
              background: '#0d1117',
              border: '1px solid #2a2e39',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 11,
              color: '#9ba3af',
              fontFamily: "'Roboto Mono', monospace",
              textAlign: 'left',
              wordBreak: 'break-all',
              marginBottom: 18,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#787b86' }}>STATUS</span>{' '}
              <span style={{ color: '#ff9800' }}>AWAITING_MASTER_APPROVAL</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#787b86' }}>NETWORK</span>{' '}
              <span style={{ color: '#2962ff' }}>Solana Devnet</span>
            </div>
            <div>
              <span style={{ color: '#787b86' }}>PUBLIC_KEY</span>{' '}
              <span style={{ color: '#fff' }}>{pubkey ?? 'not_connected'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="auth-btn auth-btn-primary"
          >
            Return to Login
          </button>

          <div className="auth-footer" style={{ marginTop: 18 }}>
            Prefer email login?{' '}
            <a href="/login" className="auth-link">Use credentials instead</a>
          </div>
        </div>
      </div>
    </div>
  );
}
