import { useMemo } from 'react';

export default function useAvailableDesigners(designers) {
  return useMemo(() => designers.filter(designer => !designer.isPaused), [designers]);
} 