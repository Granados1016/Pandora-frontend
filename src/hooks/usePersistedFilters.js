/**
 * Pandora — Filtros persistentes en localStorage (#7)
 * Guarda y restaura los filtros de una tabla/página automáticamente.
 *
 * Uso:
 *   const [filters, setFilter, clearFilters] = usePersistedFilters('inventario', {
 *     search: '', status: '', type: '',
 *   });
 */
import { useState, useCallback } from 'react';

/**
 * @param {string} key       - Clave única para identificar el conjunto de filtros
 * @param {object} defaults  - Valores por defecto de los filtros
 */
export function usePersistedFilters(key, defaults = {}) {
  const storageKey = `pandora_filters_${key}`;

  const [filters, setFiltersState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        // Mezclar con defaults para capturar nuevas claves
        return { ...defaults, ...saved };
      }
    } catch { /* ignore */ }
    return { ...defaults };
  });

  const setFilter = useCallback((name, value) => {
    setFiltersState(prev => {
      const next = { ...prev, [name]: value };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  const setFilters = useCallback((partial) => {
    setFiltersState(prev => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  const clearFilters = useCallback(() => {
    setFiltersState({ ...defaults });
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return [filters, setFilter, clearFilters, setFilters];
}
