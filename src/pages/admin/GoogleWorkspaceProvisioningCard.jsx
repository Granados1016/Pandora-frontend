import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Stack, Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Accordion, AccordionSummary, AccordionDetails, Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { googleWorkspaceProvisioningApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const TERMINAL_STATUSES = new Set(['completed', 'failed']);

const RESULT_CHIP = {
  creado: { label: 'Creado', color: 'success' },
  ya_existia: { label: 'Ya existía', color: 'default' },
  error: { label: 'Error', color: 'error' },
};

/**
 * Card del Panel Admin para disparar el alta masiva de cuentas @dominio en
 * Google Workspace, subiendo el Excel de alumnos directo. Sigue el mismo
 * patrón de Accordion que las demás secciones de Admin.jsx (recibe
 * `expanded`/`onToggle` para compartir el estado persistido en
 * localStorage) y el mismo patrón de polling que `NewCampaign.jsx`.
 */
export default function GoogleWorkspaceProvisioningCard({ expanded, onToggle }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [polling, setPolling] = useState(false);
  const [results, setResults] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] ?? null);
    setError('');
  };

  const reset = () => {
    setFile(null);
    setJobId(null);
    setJob(null);
    setResults([]);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { data } = await googleWorkspaceProvisioningApi.upload(file);
      setJobId(data.jobId);
      setJob({ status: 'processing', total: data.total, completed: 0, failed: 0 });
      setPolling(true);
    } catch (err) {
      setError(err.response?.data?.error || apiError(err, 'No se pudo subir el archivo.'));
    } finally {
      setUploading(false);
    }
  };

  // ─── Polling del estado del job (igual patrón que NewCampaign.jsx) ────────
  useEffect(() => {
    if (!polling || !jobId) return;
    const interval = setInterval(async () => {
      try {
        const { data: j } = await googleWorkspaceProvisioningApi.getJob(jobId);
        setJob(j);
        if (TERMINAL_STATUSES.has(j.status)) {
          setPolling(false);
          const { data: audit } = await googleWorkspaceProvisioningApi.getJobAudit(jobId);
          setResults(audit);
        }
      } catch {
        setPolling(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, jobId]);

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CloudSyncIcon color="primary" sx={{ fontSize: 26 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Alta masiva de cuentas (Google Workspace)</Typography>
            <Typography variant="body2" color="text.secondary">
              Sube el Excel de alumnos para crear sus cuentas institucionales automáticamente.
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
        )}

        {/* ── Sin job activo: selección de archivo ─────────────────────────── */}
        {!jobId && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <UploadFileIcon sx={{ fontSize: 56, color: 'primary.light', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Columnas requeridas: Nombre, Apellidos, matricula, contraseña (columna OU opcional).
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
              <Button
                variant="outlined" startIcon={<UploadFileIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                Seleccionar archivo .xlsx
              </Button>
              <Button
                variant="contained"
                startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudSyncIcon />}
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? 'Subiendo...' : 'Procesar alta masiva'}
              </Button>
            </Stack>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={handleFileChange} />
            {file && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                📄 {file.name}
              </Typography>
            )}
          </Box>
        )}

        {/* ── Job en curso o terminado ──────────────────────────────────────── */}
        {jobId && job && (
          <Box>
            {polling && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              {polling ? (
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Procesando alumnos...
                </Typography>
              ) : (
                <Typography variant="subtitle1" fontWeight={700}
                  color={job.failed > 0 ? 'warning.main' : 'success.main'}>
                  {job.status === 'failed'
                    ? '⚠ El proceso falló'
                    : job.failed > 0 ? '⚠ Completado con errores' : '✔ Alta masiva completada'}
                </Typography>
              )}
            </Box>

            <Grid container spacing={2} justifyContent="center" sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary" display="block" align="center">Total</Typography>
                <Typography variant="h5" fontWeight={800} align="center">{job.total}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary" display="block" align="center">Creadas / ya existían</Typography>
                <Typography variant="h5" fontWeight={800} align="center" color="success.main">{job.completed}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary" display="block" align="center">Fallidas</Typography>
                <Typography variant="h5" fontWeight={800} align="center"
                  color={job.failed > 0 ? 'error.main' : 'text.secondary'}>
                  {job.failed}
                </Typography>
              </Grid>
            </Grid>

            {results.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Matrícula</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Correo</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Resultado</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((r, i) => {
                      const chip = RESULT_CHIP[r.resultado] || { label: r.resultado, color: 'default' };
                      const nombreCompleto = [r.nombre, r.apellidos].filter(Boolean).join(' ') || '—';
                      return (
                        <TableRow key={`${r.matricula}-${i}`} sx={{ bgcolor: i % 2 === 0 ? 'white' : 'grey.50' }}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.matricula}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>{nombreCompleto}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.primaryEmail}</TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={chip.label} color={chip.color} />
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{r.detalle || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {!polling && (
              <Box textAlign="center">
                <Button variant="outlined" onClick={reset}>Subir otro archivo</Button>
              </Box>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
