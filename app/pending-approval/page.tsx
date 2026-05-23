'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import '../auth.css';

export default function PendingApproval() {
  const router = useRouter();
  const [pubkey, setPubkey] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user_pubkey') : null;
    setPubkey(stored);
  }, []);

  return (
    <div className="auth-root">
      <div className="auth-card auth-card-md">
        <div className="auth-body auth-body-center">
          <div className="auth-logo">
            <div className="auth-logo-title">
              <span className="atlas-blue">ATLAS</span>
              <span>-QUANT</span>
            </div>
            <div className="auth-logo-sub">PENDING WALLET APPROVAL</div>
          </div>

          <div className="pending-spinner-wrap">
            <div className="pending-spinner">
              <div className="pending-spinner-track" />
              <div className="pending-spinner-arc" />
            </div>
          </div>

          <p className="pending-desc">
            Your wallet signature was verified. You are waiting for the platform
            <strong> Master account</strong> to approve your public key
            on Solana Devnet before trading data unlocks.
          </p>

          <div className="pending-status-box">
            <div className="pending-status-row">
              <span className="pending-status-key">STATUS</span>{' '}
              <span className="pending-status-val-warn">AWAITING_MASTER_APPROVAL</span>
            </div>
            <div className="pending-status-row">
              <span className="pending-status-key">NETWORK</span>{' '}
              <span className="pending-status-val-blue">Solana Devnet</span>
            </div>
            <div>
              <span className="pending-status-key">PUBLIC_KEY</span>{' '}
              <span className="pending-status-val-white">{pubkey ?? 'not_connected'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="auth-btn auth-btn-primary"
          >
            Return to Login
          </button>

          <div className="auth-footer auth-footer-mt-lg">
            Prefer email login?{' '}
            <a href="/login" className="auth-link">Use credentials instead</a>
          </div>
        </div>
      </div>
    </div>
  );
}
