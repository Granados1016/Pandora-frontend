import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, LinearProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Stepper, Step, StepLabel,
  Divider, Stack, CircularProgress, Tooltip, IconButton,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { inventoryApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const STEPS = ['Seleccionar archivo', 'Revisar preview', 'Importar'];

export default function ExcelImportDialog({ open, onClose, onImported }) {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [preview, setPreview]       = useState(null);   // ImportPreviewResult
  const [result, setResult]         = useState(null);   // ImportConfirmResult
  const [error, setError]           = useState('');
  const fileRef = useRef();

  const reset = () => {
    setActiveStep(0);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ─── Paso 1: seleccionar y previsualizar ──────────────────────────────────
  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.xlsx')) {
      setError('Solo se aceptan archivos .xlsx');
      return;
    }
    setFile(f);
    setError('');
    setLoading(true);
    try {
      const r = await inventoryApi.importPreview(f);
      setPreview(r.data);
      setActiveStep(1);
    } catch (e) {
      setError(apiError(e, 'Error al leer el archivo.'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 2: confirmar importación ───────────────────────────────────────
  const handleConfirm = async () => {
    if (!preview?.validRows?.length) return;
    setLoading(true);
    setError('');
    try {
      const r = await inventoryApi.importConfirm(preview.validRows);
      setResult(r.data);
      setActiveStep(2);
      onImported?.();
    } catch (e) {
      setError(apiError(e, 'Error al importar.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, minHeight: 400 } }}>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700}>Importar inventario desde Excel</Typography>
          <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>

      <Stepper activeStep={activeStep} sx={{ px: 3, pb: 2 }}>
        {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      <Divider />

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {/* ── Paso 0: Seleccionar ── */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <UploadFileIcon sx={{ fontSize: 64, color: 'primary.light', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Selecciona tu archivo Excel</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Usa la plantilla oficial para asegurar el formato correcto
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined" startIcon={<DownloadIcon />}
                href={inventoryApi.templateUrl()} download
              >
                Descargar plantilla
              </Button>
              <Button
                variant="contained" startIcon={<UploadFileIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={loading}
              >
                Seleccionar archivo .xlsx
              </Button>
            </Stack>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={handleFileChange} />
            {file && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                📄 {file.name}
              </Typography>
            )}
          </Box>
        )}

        {/* ── Paso 1: Preview ── */}
        {activeStep === 1 && preview && (
          <Box>
            {/* Resumen */}
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Chip icon={<CheckCircleIcon />} label={`${preview.validRows.length} válidas`}    color="success" />
              <Chip icon={<ErrorIcon />}       label={`${preview.errors.length} con errores`}   color={preview.errors.length > 0 ? 'error' : 'default'} />
              <Chip                            label={`${preview.totalRows} filas totales`}      variant="outlined" />
            </Stack>

            {/* Errores */}
            {preview.errors.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  ⚠ Filas con errores (no se importarán):
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 180 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Fila</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Campo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell><Chip label={`F${e.rowNumber}`} size="small" color="error" /></TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{e.field}</TableCell>
                          <TableCell sx={{ color: 'error.main', fontSize: 12 }}>{e.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Filas válidas */}
            {preview.validRows.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  ✅ Equipos que se importarán:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 700 }}>No. Inv.</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Equipo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Marca / Modelo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Departamento</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Estatus</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.validRows.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                            {r.inventoryNumber
                              ? r.inventoryNumber
                              : <Chip label="Auto" size="small" color="primary" variant="outlined" />}
                          </TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.category}</TableCell>
                          <TableCell>{r.brand} {r.model}</TableCell>
                          <TableCell>{r.department || '—'}</TableCell>
                          <TableCell>
                            <Chip label={r.status} size="small"
                              color={r.status === 'Activo' ? 'success' : r.status === 'Mantenimiento' ? 'warning' : r.status === 'Dado de baja' ? 'error' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {preview.validRows.length === 0 && (
              <Alert severity="warning">No hay filas válidas para importar.</Alert>
            )}
          </Box>
        )}

        {/* ── Paso 2: Resultado ── */}
        {activeStep === 2 && result && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>¡Importación completada!</Typography>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
              <Chip icon={<CheckCircleIcon />} label={`${result.inserted} insertados`}    color="success" />
              {result.skipped > 0 && <Chip icon={<WarningIcon />} label={`${result.skipped} omitidos`} color="warning" />}
              {result.autoGenerated > 0 && <Chip label={`${result.autoGenerated} números auto-generados`} color="info" />}
            </Stack>
            {result.warnings?.length > 0 && (
              <Alert severity="info" sx={{ textAlign: 'left', mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Avisos:</Typography>
                {result.warnings.map((w, i) => <Typography key={i} variant="caption" display="block">• {w}</Typography>)}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep === 0 && <Button onClick={handleClose}>Cancelar</Button>}
        {activeStep === 1 && (
          <>
            <Button onClick={() => { setActiveStep(0); setPreview(null); setFile(null); }}>← Volver</Button>
            <Button
              variant="contained" onClick={handleConfirm}
              disabled={loading || !preview?.validRows?.length}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              Importar {preview?.validRows?.length} equipo{preview?.validRows?.length !== 1 ? 's' : ''}
            </Button>
          </>
        )}
        {activeStep === 2 && (
          <Button variant="contained" onClick={handleClose}>Cerrar</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
