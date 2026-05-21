import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, MenuItem,
  Chip, CircularProgress, Alert, Divider, Tooltip,
  LinearProgress, Stack, useTheme, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BeachAccessIcon  from '@mui/icons-material/BeachAccess';
import AttachFileIcon   from '@mui/icons-material/AttachFile';
import VisibilityIcon   from '@mui/icons-material/Visibility';
import CloseIcon        from '@mui/icons-material/Close';
import UploadFileIcon   from '@mui/icons-material/UploadFile';
import { DatePicker }   from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import 'dayjs/locale/es';
import api from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth.jsx';

dayjs.extend(isBetween);
dayjs.locale('es');

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const STATUS_COLOR = {
  aprobado:  '#4caf50',
  pendiente: '#ff9800',
  rechazado: '#f44336',
  cancelado: '#9e9e9e',
  holiday:   '#e53935',
};

const STATUS_LABEL = {
  Aprobado:  { color: 'success', label: 'Aprobado' },
  Pendiente: { color: 'warning', label: 'Pendiente' },
  Rechazado: { color: 'error',   label: 'Rechazado' },
  Cancelado: { color: 'default', label: 'Cancelado' },
};

const LEGEND = [
  { label: 'Aprobado',   color: STATUS_COLOR.aprobado  },
  { label: 'Solicitado', color: STATUS_COLOR.pendiente  },
  { label: 'Festivo',    color: STATUS_COLOR.holiday    },
  { label: 'Rechazado',  color: STATUS_COLOR.rechazado  },
];

// ── Mini calendario mensual interactivo ──────────────────────────────────────
function MonthGrid({ year, month, markedMap, selStart, selEnd, hovered, onDayClick, onDayHover }) {
  const theme    = useTheme();
  const firstDay = new Date(year, month, 1).getDay();
  const offset   = (firstDay + 6) % 7; // semana empieza lunes
  const total    = new Date(year, month + 1, 0).getDate();
  const today    = new Date();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++)   cells.push(d);

  // Rango efectivo para resaltar (preview con hover)
  const rangeEnd = selStart && !selEnd && hovered
    ? (dayjs(hovered).isAfter(selStart) ? hovered : null)
    : selEnd ? selEnd.format('YYYY-MM-DD') : null;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%', userSelect: 'none' }}>
      <Typography variant="subtitle2" align="center" fontWeight={700} sx={{ mb: 1 }}>
        {MONTH_NAMES[month]}
      </Typography>

      {/* Cabecera L M X J V S D */}
      <Grid container columns={7}>
        {['L','M','X','J','V','S','D'].map((d, i) => (
          <Grid item xs={1} key={i}>
            <Typography variant="caption" align="center" display="block" sx={{
              fontWeight: 600, fontSize: '0.62rem',
              color: i >= 5 ? 'error.main' : 'text.secondary',
            }}>
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Días */}
      <Grid container columns={7}>
        {cells.map((day, idx) => {
          if (!day) return <Grid item xs={1} key={`e-${idx}`} />;

          const dateStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const mark      = markedMap[dateStr];
          const isToday   = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isWeekend = (idx % 7) >= 5;
          const isPast    = dayjs(dateStr).isBefore(dayjs().startOf('day'));

          // Selección
          const isSelStart = selStart && selStart.format('YYYY-MM-DD') === dateStr;
          const isSelEnd   = selEnd   && selEnd.format('YYYY-MM-DD')   === dateStr;
          const isInRange  = selStart && rangeEnd &&
            dayjs(dateStr).isBetween(selStart.format('YYYY-MM-DD'), rangeEnd, 'day', '[]');

          // Color de fondo
          let bg        = 'transparent';
          let textColor = isWeekend ? 'error.light' : 'text.primary';
          let border    = 'none';

          if (mark) {
            bg = STATUS_COLOR[mark.type] || theme.palette.primary.light;
            textColor = '#fff';
          } else if (isSelStart || isSelEnd) {
            bg = theme.palette.primary.main;
            textColor = '#fff';
          } else if (isInRange) {
            bg = theme.palette.primary.light + '55';
            border = `1px solid ${theme.palette.primary.light}`;
          } else if (isToday) {
            bg = theme.palette.primary.main;
            textColor = '#fff';
          }

          return (
            <Grid item xs={1} key={dateStr}>
              <Tooltip
                title={mark ? (mark.requestType || mark.type) : ''}
                disableHoverListener={!mark}
              >
                <Box
                  onClick={!isPast ? () => onDayClick(dateStr) : undefined}
                  onMouseEnter={() => onDayHover(dateStr)}
                  onMouseLeave={() => onDayHover(null)}
                  sx={{
                    width: '100%', aspectRatio: '1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: isSelStart || isSelEnd ? '50%' : '4px',
                    bgcolor: bg,
                    border,
                    cursor: isPast ? 'default' : 'pointer',
                    transition: 'background 0.1s',
                    '&:hover': !isPast && !mark ? {
                      bgcolor: theme.palette.action.hover,
                    } : {},
                  }}
                >
                  <Typography variant="caption" sx={{
                    color: isPast && !mark ? 'text.disabled' : textColor,
                    fontSize: '0.68rem',
                    fontWeight: isSelStart || isSelEnd || isToday || mark ? 700 : 400,
                  }}>
                    {day}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function VacacionesPage() {
  const { fullName } = useAuth();

  const [year,      setYear]    = useState(new Date().getFullYear());
  const [markedDays,setMarked]  = useState([]);
  const [diasInfo,  setDiasInfo]= useState(null);
  const [loading,   setLoading] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  // Selección en calendario
  const [selStart,  setSelStart]  = useState(null);  // dayjs | null
  const [selEnd,    setSelEnd]    = useState(null);   // dayjs | null
  const [hovered,   setHovered]   = useState(null);  // 'YYYY-MM-DD' | null
  const [isSelecting, setIsSelecting] = useState(false);

  // Formulario
  const [tipo,    setTipo]    = useState('Vacaciones');
  const [notas,   setNotas]   = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Documento adjunto
  const fileInputRef    = useRef(null);
  const pendingUploadId = useRef(null);
  const [uploadingId,   setUploadingId]   = useState(null);
  const [docOpen,       setDocOpen]       = useState(false);
  const [docBlobUrl,    setDocBlobUrl]    = useState(null);
  const [docMime,       setDocMime]       = useState('');

  // Paginación historial (#4)
  const [histPage,         setHistPage]         = useState(0);
  const [histRowsPerPage,  setHistRowsPerPage]  = useState(10);

  // ── Carga datos ─────────────────────────────────────────────────────────────
  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, diasRes] = await Promise.all([
        api.get(`/vacaciones/mi-calendario/${year}`),
        api.get('/vacaciones/mis-dias'),
      ]);
      setMarked(calRes.data);
      setDiasInfo(diasRes.data);
    } catch { setError('No se pudo cargar el calendario.'); }
    finally   { setLoading(false); }
  }, [year]);

  const loadHistorial = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await api.get('/vacaciones/mis-solicitudes');
      setHistorial(res.data);
    } catch { /* silencioso */ }
    finally   { setHistLoading(false); }
  }, []);

  useEffect(() => { loadCalendar(); },  [loadCalendar]);
  useEffect(() => { loadHistorial(); }, [loadHistorial]);

  // Mapa fecha → marca
  const markedMap = useMemo(() =>
    markedDays.reduce((acc, m) => { acc[m.date] = m; return acc; }, {}),
    [markedDays]
  );

  // ── Interacción con calendario ──────────────────────────────────────────────
  const handleDayClick = (dateStr) => {
    const d = dayjs(dateStr);
    if (!isSelecting || !selStart) {
      setSelStart(d);
      setSelEnd(null);
      setIsSelecting(true);
    } else {
      if (d.isBefore(selStart, 'day')) {
        setSelStart(d);
        setSelEnd(null);
      } else {
        setSelEnd(d);
        setIsSelecting(false);
      }
    }
  };

  // ── Enviar solicitud ────────────────────────────────────────────────────────
  const handleSolicitar = async () => {
    if (!selStart) { setError('Selecciona las fechas en el calendario o en los campos.'); return; }
    const end = selEnd || selStart;
    setSending(true);
    setError('');
    try {
      const res = await api.post('/vacaciones/solicitar', {
        startDate: selStart.format('YYYY-MM-DD'),
        endDate:   end.format('YYYY-MM-DD'),
        type:      tipo,
        notes:     notas || null,
      });
      setSuccess(`Solicitud enviada — ${res.data.totalDays} día(s) hábil(es).`);
      setSelStart(null);
      setSelEnd(null);
      setIsSelecting(false);
      setNotas('');
      loadCalendar();
      loadHistorial();
    } catch (err) {
      setError(err.response?.data || 'Error al enviar la solicitud.');
    } finally {
      setSending(false);
    }
  };

  const handleCancelar = async (id) => {
    if (!window.confirm('¿Cancelar esta solicitud?')) return;
    try {
      await api.delete(`/vacaciones/${id}/cancelar`);
      loadCalendar();
      loadHistorial();
    } catch { alert('No se pudo cancelar.'); }
  };

  // ── Documentos adjuntos ─────────────────────────────────────────────────────
  const handleUploadClick = (id) => {
    pendingUploadId.current = id;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setError('Solo se permiten archivos PDF, JPG o PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB.');
      return;
    }
    const id       = pendingUploadId.current;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(id);
    setError('');
    try {
      await api.post(`/vacaciones/${id}/documento`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Documento subido correctamente.');
      loadHistorial();
    } catch (err) {
      setError(err.response?.data || 'Error al subir el documento.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleViewDoc = async (id) => {
    try {
      const res = await api.get(`/vacaciones/${id}/documento`, { responseType: 'blob' });
      if (docBlobUrl) URL.revokeObjectURL(docBlobUrl);
      setDocBlobUrl(URL.createObjectURL(res.data));
      setDocMime(res.data.type);
      setDocOpen(true);
    } catch {
      setError('No se pudo cargar el documento.');
    }
  };

  const handleCloseDoc = () => {
    if (docBlobUrl) URL.revokeObjectURL(docBlobUrl);
    setDocBlobUrl(null);
    setDocMime('');
    setDocOpen(false);
  };

  const pct = diasInfo
    ? Math.min(100, Math.round((diasInfo.usedDays / diasInfo.totalDays) * 100))
    : 0;

  const endEffective = selEnd || (isSelecting && hovered && dayjs(hovered).isAfter(selStart)
    ? dayjs(hovered) : selStart);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* Encabezado */}
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <BeachAccessIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Mis Vacaciones</Typography>
        </Stack>

        <Grid container spacing={2}>
          {/* ── Panel izquierdo ──────────────────────────────────────── */}
          <Grid item xs={12} md={3} lg={2.5}>
            <Paper sx={{ p: 2, borderRadius: 2, position: { md: 'sticky' }, top: 80 }}>

              {/* Días disponibles */}
              <Typography variant="overline" color="text.secondary">Días Disponibles</Typography>
              {diasInfo ? (
                <>
                  <Typography variant="h4" fontWeight={800} align="center" color="primary" sx={{ my: 0.5 }}>
                    {diasInfo.availableDays}/{diasInfo.totalDays}
                  </Typography>
                  <LinearProgress
                    variant="determinate" value={pct}
                    color={pct > 80 ? 'error' : pct > 50 ? 'warning' : 'success'}
                    sx={{ borderRadius: 2, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {diasInfo.usedDays} usado(s) · {diasInfo.year}
                  </Typography>
                  {diasInfo.pendingDays > 0 && (
                    <Typography variant="caption" color="warning.main" display="block">
                      {diasInfo.pendingDays} día(s) en revisión
                    </Typography>
                  )}
                </>
              ) : <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 1 }} />}

              <Divider sx={{ my: 2 }} />

              {/* Instrucción */}
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Haz clic en el calendario para seleccionar las fechas, o úsalos directamente aquí:
              </Typography>

              {/* Formulario */}
              <Stack spacing={1.5}>
                <DatePicker
                  label="Desde"
                  value={selStart}
                  onChange={v => { setSelStart(v); if (selEnd && v && selEnd.isBefore(v)) setSelEnd(v); }}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  disablePast
                />
                <DatePicker
                  label="Hasta"
                  value={selEnd}
                  onChange={v => setSelEnd(v)}
                  minDate={selStart || undefined}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  disablePast
                />

                {/* Preview días hábiles */}
                {selStart && (
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    {selEnd
                      ? `${selEnd.diff(selStart, 'day') + 1} día(s) en el rango (hábiles calculados al enviar)`
                      : 'Selecciona la fecha fin'}
                  </Typography>
                )}

                <TextField select size="small" label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)}>
                  {['Vacaciones','Permiso','Ausencia','Día equipo'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  multiline rows={2} size="small"
                  label="Nota (opcional)"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  inputProps={{ maxLength: 300 }}
                />

                {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ fontSize: '0.75rem' }}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ fontSize: '0.75rem' }}>{success}</Alert>}

                <Button
                  variant="contained" fullWidth
                  onClick={handleSolicitar}
                  disabled={sending || !selStart}
                  startIcon={sending ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {sending ? 'Enviando…' : 'Solicitar'}
                </Button>

                {(selStart || selEnd) && (
                  <Button size="small" color="inherit" onClick={() => { setSelStart(null); setSelEnd(null); setIsSelecting(false); }}>
                    Limpiar selección
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Leyenda */}
              <Typography variant="overline" color="text.secondary">Leyenda</Typography>
              <Stack spacing={0.5} mt={0.5}>
                {LEGEND.map(l => (
                  <Stack direction="row" alignItems="center" spacing={1} key={l.label}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: l.color, flexShrink: 0 }} />
                    <Typography variant="caption">{l.label}</Typography>
                  </Stack>
                ))}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'primary.main', flexShrink: 0 }} />
                  <Typography variant="caption">Seleccionado</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* ── Área derecha ──────────────────────────────────────────── */}
          <Grid item xs={12} md={9} lg={9.5}>

            {/* Navegación año */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                {fullName ? `${fullName} · ${year}` : String(year)}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton size="small" onClick={() => setYear(y => y - 1)}><ChevronLeftIcon /></IconButton>
                <Typography variant="h6" fontWeight={700} minWidth={50} align="center">{year}</Typography>
                <IconButton size="small" onClick={() => setYear(y => y + 1)}><ChevronRightIcon /></IconButton>
              </Stack>
            </Stack>

            {/* Calendario */}
            {loading ? (
              <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            ) : (
              <Grid container spacing={1.5}>
                {Array.from({ length: 12 }, (_, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                    <MonthGrid
                      year={year} month={i}
                      markedMap={markedMap}
                      selStart={selStart}
                      selEnd={selEnd}
                      hovered={hovered}
                      onDayClick={handleDayClick}
                      onDayHover={setHovered}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            {/* ── Historial ──────────────────────────────────────────── */}
            <Box mt={4}>
              <Typography variant="h6" fontWeight={700} mb={1.5}>
                Historial de Vacaciones
              </Typography>

              {histLoading ? (
                <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
              ) : historial.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">No hay solicitudes registradas aún.</Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Tipo</strong></TableCell>
                        <TableCell><strong>Desde</strong></TableCell>
                        <TableCell><strong>Hasta</strong></TableCell>
                        <TableCell align="center"><strong>Días</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                        <TableCell><strong>Nota</strong></TableCell>
                        <TableCell><strong>Revisión / Evidencia</strong></TableCell>
                        <TableCell align="center"><strong>Documento</strong></TableCell>
                        <TableCell align="center"><strong>Acción</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historial.slice(histPage * histRowsPerPage, histPage * histRowsPerPage + histRowsPerPage).map(s => {
                        const sc = STATUS_LABEL[s.status] || { color: 'default', label: s.status };
                        return (
                          <TableRow key={s.id} hover>
                            <TableCell>{s.type}</TableCell>
                            <TableCell>{s.startDate}</TableCell>
                            <TableCell>{s.endDate}</TableCell>
                            <TableCell align="center"><strong>{s.totalDays}</strong></TableCell>
                            <TableCell>
                              <Chip label={sc.label} color={sc.color} size="small" />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 160 }}>
                              <Typography variant="caption">{s.notes || '—'}</Typography>
                            </TableCell>
                            {/* Evidencia de revisión (#15) */}
                            <TableCell sx={{ maxWidth: 200 }}>
                              {s.reviewedBy ? (
                                <Box sx={{
                                  border: '1px solid',
                                  borderColor: s.status === 'Aprobada' ? 'success.main' : s.status === 'Rechazada' ? 'error.main' : 'divider',
                                  borderRadius: 1.5,
                                  p: 0.75,
                                  bgcolor: s.status === 'Aprobada' ? 'success.50' : s.status === 'Rechazada' ? 'error.50' : 'transparent',
                                }}>
                                  <Typography variant="caption" fontWeight={700} display="block" color={s.status === 'Aprobada' ? 'success.dark' : 'error.dark'}>
                                    {s.status === 'Aprobada' ? '✅' : '❌'} {s.reviewedBy}
                                  </Typography>
                                  {s.reviewedAt && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {new Date(s.reviewedAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                  )}
                                  {s.reviewNotes && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', mt: 0.25 }}>
                                      "{s.reviewNotes}"
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.disabled">Sin revisar</Typography>
                              )}
                            </TableCell>
                            {/* Columna Documento */}
                            <TableCell align="center">
                              {s.hasDocument ? (
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <Tooltip title="Ver documento">
                                    <IconButton size="small" color="primary" onClick={() => handleViewDoc(s.id)}>
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reemplazar documento">
                                    <IconButton
                                      size="small" color="secondary"
                                      onClick={() => handleUploadClick(s.id)}
                                      disabled={uploadingId === s.id}
                                    >
                                      {uploadingId === s.id
                                        ? <CircularProgress size={14} />
                                        : <UploadFileIcon fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              ) : (
                                <Tooltip title="Adjuntar documento firmado">
                                  <span>
                                    <Button
                                      size="small" variant="outlined" color="inherit"
                                      startIcon={uploadingId === s.id
                                        ? <CircularProgress size={12} color="inherit" />
                                        : <AttachFileIcon />}
                                      onClick={() => handleUploadClick(s.id)}
                                      disabled={uploadingId === s.id}
                                      sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                                    >
                                      {uploadingId === s.id ? 'Subiendo…' : 'Adjuntar'}
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {s.status === 'Pendiente' && (
                                <Button size="small" color="error" variant="outlined"
                                  onClick={() => handleCancelar(s.id)}>
                                  Cancelar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={historial.length}
                    page={histPage}
                    onPageChange={(_, p) => setHistPage(p)}
                    rowsPerPage={histRowsPerPage}
                    onRowsPerPageChange={e => { setHistRowsPerPage(parseInt(e.target.value, 10)); setHistPage(0); }}
                    rowsPerPageOptions={[5, 10, 25]}
                    labelRowsPerPage="Filas:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                  />
                </TableContainer>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Input oculto para subir archivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Visor de documento */}
      <Dialog open={docOpen} onClose={handleCloseDoc} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Documento adjunto
          <IconButton
            onClick={handleCloseDoc}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, minHeight: 400 }}>
          {docMime === 'application/pdf' ? (
            <Box sx={{ width: '100%', height: '65vh' }}>
              <iframe
                src={docBlobUrl}
                title="Documento PDF"
                width="100%"
                height="100%"
                style={{ border: 'none', display: 'block' }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, minHeight: 300 }}>
              <img
                src={docBlobUrl}
                alt="Documento adjunto"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 4 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            component="a"
            href={docBlobUrl}
            download="documento"
            variant="outlined"
            size="small"
            startIcon={<AttachFileIcon />}
          >
            Descargar
          </Button>
          <Button onClick={handleCloseDoc} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>

    </LocalizationProvider>
  );
}
