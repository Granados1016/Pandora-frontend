/**
 * PdfThumbnail — renderiza la primera página de un PDF protegido como imagen.
 * Usa pdfjs-dist; carga el PDF solo cuando el componente es visible en pantalla
 * (IntersectionObserver) para no sobrecargar el navegador.
 */
import React, { useEffect, useRef, useState, memo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Box, CircularProgress } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// Worker como módulo ES (compatible con Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

// Caché global: url → dataUrl (evita re-renderizar la misma página)
const thumbCache = new Map();

function PdfThumbnail({ url, width = 140, height = 180, fallbackColor = '#1a237e' }) {
  const [estado, setEstado] = useState('idle');   // idle | loading | ok | error
  const [dataUrl, setDataUrl] = useState(null);
  const containerRef = useRef(null);
  const renderRef    = useRef(false);             // evita doble render en StrictMode

  useEffect(() => {
    if (!url) return;

    // Si ya está en caché, usarlo directamente
    if (thumbCache.has(url)) {
      setDataUrl(thumbCache.get(url));
      setEstado('ok');
      return;
    }

    // Observar visibilidad antes de cargar el PDF (lazy)
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || renderRef.current) return;
        renderRef.current = true;
        observer.disconnect();

        setEstado('loading');
        try {
          const loadTask = pdfjsLib.getDocument({ url, disableStream: false });
          const pdf  = await loadTask.promise;
          const page = await pdf.getPage(1);

          // Escalar para que la anchura coincida con `width`
          const vp    = page.getViewport({ scale: 1 });
          const scale = (width * window.devicePixelRatio) / vp.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width  = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;

          const result = canvas.toDataURL('image/jpeg', 0.75);
          thumbCache.set(url, result);
          setDataUrl(result);
          setEstado('ok');

          pdf.destroy();
        } catch {
          setEstado('error');
        }
      },
      { rootMargin: '200px' },
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [url, width]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: fallbackColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Miniatura renderizada */}
      {estado === 'ok' && dataUrl && (
        <Box
          component="img"
          src={dataUrl}
          alt="portada"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      {/* Cargando */}
      {estado === 'loading' && (
        <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.7)' }} />
      )}

      {/* Placeholder (idle o error) */}
      {(estado === 'idle' || estado === 'error') && (
        <MenuBookIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.3)' }} />
      )}
    </Box>
  );
}

export default memo(PdfThumbnail);
