import { useMemo } from 'react';

export default function useAvailableServices(services, designers, selectedDesigner) {
  return useMemo(() => {
    if (selectedDesigner === 0) {
      return services.filter(s => s.status !== 'inactive');
    }
    if (!selectedDesigner) return [];
    const designer = designers.find(d => d.id === Number(selectedDesigner));
    if (!designer || !designer.services) return services.filter(s => s.status !== 'inactive');
    return designer.services
      .map(sid => services.find(s => String(s.id) === String(sid) && s.status !== 'inactive'))
      .filter(Boolean);
  }, [services, designers, selectedDesigner]);
} 