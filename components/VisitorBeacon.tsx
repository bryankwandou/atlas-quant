'use client';
/**
 * Beacon visitor self-hosted — ping /api/track sekali per navigasi.
 * Ringan, fire-and-forget, tak pernah mengganggu render (gagal = diam).
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* diam */ }
  }, [pathname]);
  return null;
}
