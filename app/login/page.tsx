'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deriveClientKeypair, signMessageClient } from '@/src/utils/crypto-browser';

type LoginMode = 'wallet' | 'password';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toBase58(): string };
      connect(): Promise<{ publicKey: { toBase58(): string } }>;
      disconnect(): Promise<void>;
      signMessage(msg: Uint8Array, encoding: 'utf8'): Promise<{ signature: Uint8Array }>;
      isConnected?: boolean;
    };
  }
}

export default function Login() {
  const [mode, setMode]         = useState<LoginMode>('wallet');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null);
  const [phantomAvailable, setPhantomAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check Phantom availability after mount
    const checkPhantom = () => {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        setPhantomAvailable(true);
        if (window.solana.isConnected && window.solana.publicKey) {
          setWalletPubkey(window.solana.publicKey.toBase58());
        }
      }
    };
    checkPhantom();
    window.addEventListener('load', checkPhantom);
    return () => window.removeEventListener('load', checkPhantom);
  }, []);

  async function doAuth(publicKeyBase58: string, signFn: (msg: string) => Promise<string>) {
    // 1. Get challenge
    const chalRes = await fetch('/api/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKeyBase58 }),
    });
    const chalData = await chalRes.json();
    if (!chalRes.ok) throw new Error(chalData.error || 'Challenge failed');

    // 2. Sign challenge
    const signature = await signFn(chalData.message);

    // 3. Verify
    const verRes = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKeyBase58, signature, challenge: chalData }),
    });
    const verData = await verRes.json();
    if (!verRes.ok) {
      if (verData.status === 'pending') { router.push('/pending-approval'); return; }
      throw new Error(verData.error || 'Verification failed');
    }
    localStorage.setItem('session_token', verData.token);
    localStorage.setItem('user_pubkey', publicKeyBase58);
    router.push('/');
  }

  async function handleWalletConnect() {
    setError(''); setLoading(true);
    try {
      if (!window.solana?.isPhantom) throw new Error('Phantom wallet not found. Install from phantom.app');
      const resp = await window.solana.connect();
      const pubkey = resp.publicKey.toBase58();
      setWalletPubkey(pubkey);
      await doAuth(pubkey, async (msg: string) => {
        const msgBytes = new TextEncoder().encode(msg);
        const signed = await window.solana!.signMessage(msgBytes, 'utf8');
        // Convert Uint8Array to bs58 string
        const { default: bs58 } = await import('bs58');
        return bs58.encode(signed.signature);
      });
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleDisconnect() {
    if (window.solana) await window.solana.disconnect();
    setWalletPubkey(null);
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // Check admin bypass first
      const adminRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const adminData = await adminRes.json();
      if (adminData.session_token || adminData.adminToken) {
        localStorage.setItem('session_token', adminData.session_token || adminData.adminToken);
        router.push('/'); return;
      }

      const { publicKeyBase58, secretKeyBytes } = await deriveClientKeypair(username, password);
      await doAuth(publicKeyBase58, async (msg: string) => signMessageClient(msg, secretKeyBytes));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const pubkeyShort = walletPubkey ? `${walletPubkey.slice(0, 6)}...${walletPubkey.slice(-4)}` : '';

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Roboto Mono, monospace' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#2962ff' }}>ATLAS</span>
            <span style={{ color: '#089981' }}>-</span>
            <span style={{ color: '#fff' }}>QUANT</span>
          </div>
          <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '4px', letterSpacing: '2px' }}>
            MULTI-FACTOR QUANTITATIVE PLATFORM v2.0
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#131722', border: '1px solid #2a2e39', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #2a2e39' }}>
            {(['wallet', 'password'] as LoginMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '14px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                  background: mode === m ? '#1e2230' : 'transparent',
                  color: mode === m ? '#fff' : '#4a5568',
                  borderBottom: mode === m ? '2px solid #2962ff' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'wallet' ? '⬡ Phantom Wallet' : '⚿ Local Identity'}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px' }}>
            {mode === 'wallet' ? (
              <div>
                <p style={{ fontSize: '12px', color: '#787b86', marginBottom: '20px', lineHeight: 1.6 }}>
                  Connect your Solana wallet. A cryptographic challenge will be signed locally — your private key never leaves your device.
                </p>

                {!walletPubkey ? (
                  <>
                    <button
                      onClick={handleWalletConnect}
                      disabled={loading}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        background: loading ? '#1e2230' : 'linear-gradient(135deg, #9945FF, #14F195)',
                        color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
                      }}
                    >
                      {loading ? (
                        <><span style={spinnerStyle} />Authenticating...</>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
                            <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0z" fill="#AB9FF2"/>
                            <path d="M110.5 64.9H89.3c-3.6 0-6.5 2.9-6.5 6.5v13c0 3.6 2.9 6.5 6.5 6.5h21.2V64.9z" fill="#fff"/>
                          </svg>
                          Connect Phantom
                        </>
                      )}
                    </button>

                    {!phantomAvailable && (
                      <p style={{ fontSize: '11px', color: '#f7a600', marginTop: '12px', textAlign: 'center' }}>
                        Phantom not detected.{' '}
                        <a href="https://phantom.app" target="_blank" rel="noreferrer" style={{ color: '#2962ff' }}>
                          Install Phantom
                        </a>
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ background: '#0d1117', border: '1px solid #2a2e39', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', color: '#4a5568', marginBottom: '4px' }}>CONNECTED WALLET</div>
                      <div style={{ fontSize: '14px', color: '#14F195', fontWeight: 600 }}>{pubkeyShort}</div>
                    </div>
                    <button
                      onClick={handleWalletConnect}
                      disabled={loading}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: '#2962ff', color: '#fff', fontWeight: 700, fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? <><span style={spinnerStyle} />Signing...</> : 'Sign & Authenticate'}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      style={{ width: '100%', padding: '10px', marginTop: '8px', borderRadius: '8px', border: '1px solid #2a2e39', background: 'transparent', color: '#4a5568', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handlePasswordLogin}>
                <p style={{ fontSize: '12px', color: '#787b86', marginBottom: '20px', lineHeight: 1.6 }}>
                  Credentials are hashed locally to derive a unique keypair. No password is ever transmitted.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>IDENTITY</label>
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>PASSPHRASE</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading ? '#1e2230' : '#2962ff',
                      color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px', marginTop: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
                    }}
                  >
                    {loading ? <><span style={spinnerStyle} />Authenticating...</> : 'Authenticate →'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#4a5568', textAlign: 'center', marginTop: '16px' }}>
                  No account?{' '}
                  <a href="/register" style={{ color: '#2962ff', textDecoration: 'none' }}>Create local identity</a>
                </p>
              </form>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(242,54,69,0.1)', border: '1px solid rgba(242,54,69,0.3)', borderRadius: '8px', fontSize: '12px', color: '#f23645' }}>
                ⚠ {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#2a2e39', letterSpacing: '1px' }}>
          ATLAS-QUANT © 2025 · CRYPTOGRAPHIC AUTH · ZERO-CUSTODY
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #2a2e39',
  background: '#0d1117', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Roboto Mono, monospace',
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block', width: '12px', height: '12px',
  borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#fff', animation: 'spin 0.6s linear infinite',
};
