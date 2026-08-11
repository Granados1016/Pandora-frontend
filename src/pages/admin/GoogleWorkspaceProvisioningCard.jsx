import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Stack, Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Accordion, AccordionSummary, AccordionDetails, Grid, TextField, InputAdornment,
  IconButton, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { googleWorkspaceProvisioningApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const TERMINAL_STATUSES = new Set(['completed', 'failed']);

const RESULT_CHIP = {
  creado: { label: 'Creado', color: 'success' },
  ya_existia: { label: 'Ya existía', color: 'default' },
  error: { label: 'Error', color: 'error' },
};

/** Tabla de resultados reutilizada entre el job actual y el buscador global. */
function ResultsTable({ rows, showDate }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Matrícula</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Nombre</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Correo</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Resultado</TableCell>
            {showDate
              ? <TableCell sx={{ color: 'white', fontWeight: 700 }}>Fecha</TableCell>
              : <TableCell sx={{ color: 'white', fontWeight: 700 }}>Detalle</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => {
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
                {showDate
                  ? <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                      {new Date(r.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                  : <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{r.detalle || '—'}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

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
  const [exporting, setExporting] = useState(false);

  // ─── Buscador global (todos los lotes, no solo el actual) ─────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = sin buscar aún
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (searchQuery.trim().length < 2) {
      setSearchError('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const { data } = await googleWorkspaceProvisioningApi.buscarAudit(searchQuery.trim());
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.response?.data?.error || apiError(err, 'Error al buscar.'));
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

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

  const handleExportar = async () => {
    setExporting(true);
    try {
      await googleWorkspaceProvisioningApi.exportarResultados(jobId);
    } catch (err) {
      setError(apiError(err, 'Error al exportar a Excel.'));
    } finally {
      setExporting(false);
    }
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

        {/* ── Buscador global: ¿ya se creó esta cuenta? ────────────────────── */}
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Buscar alumno ya creado
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small" fullWidth
              placeholder="Matrícula, nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
            />
            <IconButton type="submit" color="primary" disabled={searching} sx={{ border: 1, borderColor: 'divider' }}>
              {searching ? <CircularProgress size={20} /> : <SearchIcon />}
            </IconButton>
          </Stack>
          {searchError && (
            <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setSearchError('')}>{searchError}</Alert>
          )}
          {searchResults && (
            <Box sx={{ mt: 1.5 }}>
              {searchResults.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No se encontró ningún alumno que coincida con "{searchQuery}".
                </Typography>
              ) : (
                <ResultsTable rows={searchResults} showDate />
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

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
              <>
                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                  <Button
                    size="small" variant="outlined"
                    startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                    onClick={handleExportar} disabled={exporting}
                  >
                    Exportar Excel
                  </Button>
                </Stack>
                <ResultsTable rows={results} />
              </>
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
