'use client';
import { useEffect } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useIndicatorModal } from '@/hooks/useIndicatorModal';

/**
 * Syncs the chartStore.showIndicatorModal with the zustand indicatorModal store.
 * This allows TopBar to open the modal via chartStore.openIndicatorModal()
 * while IndicatorModal reads from useIndicatorModal().
 */
export default function IndicatorModalProvider({ children }: { children: React.ReactNode }) {
  const showIndicatorModal = useChartStore(s => s.showIndicatorModal);
  const { open, close } = useIndicatorModal();

  useEffect(() => {
    if (showIndicatorModal) open();
    else close();
  }, [showIndicatorModal, open, close]);

  return <>{children}</>;
}
