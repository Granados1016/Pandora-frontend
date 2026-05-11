import { useState, useCallback } from 'react';

export const DEFAULT_WIDGET_ORDER = [
  'welcome',
  'mailStats',
  'quickActions',
  'recentCampaigns',
  'inventory',
  'calendar',
  'tickets',
  'licencias',
];

const DEFAULT_LAYOUT = DEFAULT_WIDGET_ORDER.map(id => ({ id, enabled: true }));

function mergeWithDefaults(saved) {
  const savedIds = new Set(saved.map(w => w.id));
  const newWidgets = DEFAULT_LAYOUT.filter(w => !savedIds.has(w.id));
  // Remove widgets that no longer exist
  const valid = saved.filter(w => DEFAULT_WIDGET_ORDER.includes(w.id));
  return [...valid, ...newWidgets];
}

export function useDashboardLayout(username) {
  const key = `pandora_dashboard_${username || 'default'}`;

  const [layout, setLayoutState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeWithDefaults(parsed);
        }
      }
    } catch { /* ignore */ }
    return [...DEFAULT_LAYOUT];
  });

  const persist = useCallback((next) => {
    setLayoutState(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }, [key]);

  const toggleWidget = useCallback((id) => {
    persist(layout.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }, [layout, persist]);

  const reorderWidget = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const next = [...layout];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    persist(next);
  }, [layout, persist]);

  const resetLayout = useCallback(() => {
    persist([...DEFAULT_LAYOUT]);
  }, [persist]);

  return { layout, toggleWidget, reorderWidget, resetLayout };
}
