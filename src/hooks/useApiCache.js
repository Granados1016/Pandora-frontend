/**
 * Pandora — Caché de peticiones repetidas (#18)
 * Hook para cachear respuestas de API y evitar peticiones duplicadas.
 * La caché es in-memory (por tab), con TTL configurable.
 *
 * Uso:
 *   const { data, loading, error, refresh } = useApiCache(
 *     'departments',
 *     () => catalogApi.getDepartments(),
 *     { ttl: 5 * 60 * 1000 }  // 5 minutos
 *   );
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// Caché global compartida entre todas las instancias del hook
const CACHE = new Map(); // key → { data, timestamp }

/**
 * @param {string}   key       - Clave única para identificar la petición
 * @param {Function} fetcher   - Función async que realiza la petición
 * @param {object}   options
 * @param {number}   [options.ttl=300000]    - TTL en ms (default: 5 min)
 * @param {boolean}  [options.enabled=true]  - Si false, no ejecuta la petición
 * @param {any[]}    [options.deps=[]]       - Dependencias adicionales (como useEffect)
 */
export function useApiCache(key, fetcher, { ttl = 5 * 60_000, enabled = true, deps = [] } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError]     = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;

    // Verificar si hay una entrada válida en caché
    const cached = CACHE.get(key);
    if (!force && cached && (Date.now() - cached.timestamp < ttl)) {
      if (isMounted.current) {
        setData(cached.data);
        setLoading(false);
      }
      return;
    }

    if (isMounted.current) setLoading(true);

    try {
      const response = await fetcher();
      const result = response?.data ?? response;
      CACHE.set(key, { data: result, timestamp: Date.now() });
      if (isMounted.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) setError(err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, enabled, ...deps]);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, error, refresh };
}

/**
 * Invalida una entrada específica de caché.
 * Útil para forzar recarga después de crear/editar/eliminar.
 */
export function invalidateCache(key) {
  CACHE.delete(key);
}

/**
 * Invalida todas las entradas de caché que empiecen con un prefijo.
 */
export function invalidateCacheByPrefix(prefix) {
  for (const key of CACHE.keys()) {
    if (key.startsWith(prefix)) CACHE.delete(key);
  }
}
