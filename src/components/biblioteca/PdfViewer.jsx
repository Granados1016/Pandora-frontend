import React, { useState, useEffect, useRef } from 'react';
import {
  Box, CircularProgress, Typography, Alert, IconButton,
  Tooltip, Button, Stack,
} from '@mui/material';
import OpenInNewIcon   from '@mui/icons-material/OpenInNew';
import FullscreenIcon  from '@mui/icons-material/Fullscreen';
import DownloadIcon    from '@mui/icons-material/Download';
import RefreshIcon     from '@mui/icons-material/Refresh';

const TIMEOUT_MS = 25_000; // 25 s antes de mostrar el mensaje de error por timeout

export default function PdfViewer({ url, titulo, height = '75vh' }) {
  const [estado, setEstado] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [reloadKey, setReloadKey] = useState(0);
  const timerRef = useRef(null);

  // Reinicia el estado cada vez que cambia la URL o se fuerza un reload
  useEffect(() => {
    setEstado('loading');

    // Timeout de seguridad: si el iframe no responde en TIMEOUT_MS → error
    timerRef.current = setTimeout(() => setEstado('error'), TIMEOUT_MS);

    return () => clearTimeout(timerRef.current);
  }, [url, reloadKey]);

  const handleLoad  = () => { clearTimeout(timerRef.current); setEstado('ok');    };
  const handleError = () => { clearTimeout(timerRef.current); setEstado('error'); };
  const handleReload = () => setReloadKey(k => k + 1);

  // URL para abrir/descargar: reutilizamos la misma URL protegida
  const handleNuevaTab  = () => window.open(url, '_blank');
  const handleDescargar = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo || 'documento'}.pdf`;
    a.click();
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height }}>

      {/* ── Barra de herramientas ───────────────────────────────────────────── */}
      <Box sx={{
        position: 'absolute', top: 8, right: 8, zIndex: 10,
        display: 'flex', gap: 0.5,
        bgcolor: 'rgba(0,0,0,0.55)', borderRadius: 2, p: 0.5,
      }}>
        <Tooltip title="Abrir en nueva pestaña">
          <IconButton size="small" sx={{ color: 'white' }} onClick={handleNuevaTab}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Descargar PDF">
          <IconButton size="small" sx={{ color: 'white' }} onClick={handleDescargar}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Pantalla completa">
          <IconButton size="small" sx={{ color: 'white' }}
            onClick={() => document.getElementById('pdf-iframe')?.requestFullscreen?.()}>
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Spinner de carga ────────────────────────────────────────────────── */}
      {estado === 'loading' && (
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: '#f5f5f5', borderRadius: 2, zIndex: 5,
        }}>
          <CircularProgress size={48} />
          <Typography variant="caption" mt={2} color="text.secondary">
            Cargando {titulo}…
          </Typography>
          <Typography variant="caption" color="text.disabled" mt={0.5}>
            Puede tardar unos segundos
          </Typography>
        </Box>
      )}

      {/* ── Error / fallback ────────────────────────────────────────────────── */}
      {estado === 'error' && (
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: '#fafafa', borderRadius: 2, gap: 2, p: 4, zIndex: 5,
        }}>
          <Typography fontSize={48}>📄</Typography>
          <Typography variant="h6" fontWeight={700}>No se pudo cargar el visor</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Puede ser por configuración del navegador o tamaño del archivo.
            Usa una de estas opciones:
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
            <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={handleNuevaTab}>
              Abrir en nueva pestaña
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDescargar}>
              Descargar PDF
            </Button>
            <Button variant="text" startIcon={<RefreshIcon />} onClick={handleReload}>
              Reintentar
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── iframe ──────────────────────────────────────────────────────────── */}
      <iframe
        key={reloadKey}
        id="pdf-iframe"
        src={`${url}#toolbar=1&navpanes=0`}
        title={titulo}
        width="100%"
        height="100%"
        style={{
          border: 'none',
          borderRadius: 8,
          display: estado === 'ok' ? 'block' : 'none',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </Box>
  );
}
