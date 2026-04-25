import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, IconButton, Tooltip, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Tabs, Tab, Divider,
} from '@mui/material';
import PendingActionsIcon  from '@mui/icons-material/PendingActions';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import CancelIcon          from '@mui/icons-material/Cancel';
import DeleteIcon          from '@mui/icons-material/Delete';
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined';
import RefreshIcon         from '@mui/icons-material/Refresh';
import CalendarMonthIcon   from '@mui/icons-material/CalendarMonth';
import CoffeeIcon          from '@mui/icons-material/Coffee';
import { format, parseISO } from 'date-fns';
import { es }              from 'date-fns/locale';
import { roomRequestApi, calendarApi } from '../../api/pandoraApi';
import ReservationModal    from './ReservationModal';

const STATUS_CONFIG = {
  Pendiente: { color: 'warning',  label: 'Pendiente' },
  Aprobada:  { color: 'success',  label: 'Aprobada'  },
  Rechazada: { color: 'error',    label: 'Rechazada'  },
};

const TABS = [
  { value: '',          label: 'Todas'      },
  { value: 'Pendiente', label: 'Pendientes' },
  { value: 'Aprobada',  label: 'Aprobadas'  },
  { value: 'Rechazada', label: 'Rechazadas' },
];

export default function RoomRequestsManager() {
  const [requests, setRequests]   = useState([]);
  const [rooms, setRooms]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState('');
  const [error, setError]         = useState('');

  const [detailRow, setDetailRow]     = useState(null);
  const [rejectRow, setRejectRow]     = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveRow, setApproveRow]   = useState(null);
  const [deleteRow, setDeleteRow]     = useState(null);
  const [acting, setActing]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    // Cargamos las solicitudes (crítico) y las salas (opcional) de forma independiente
    try {
      const reqRes = await roomRequestApi.getAll(tab || undefined);
      setRequests(reqRes.data);
    } catch (e) {
      const msg = e.response?.data || e.message || 'Error desconocido';
      setError(`No se pudieron cargar las solicitudes: ${msg}`);
    } finally {
      setLoading(false);
    }

    // Salas: solo para el modal de aprobación, no bloquea la vista
    try {
      const roomRes = await calendarApi.getRooms();
      setRooms(roomRes.data.filter((r) => r.isActive));
    } catch {
      // silencioso — las salas son opcionales en esta vista
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  // ── Aprobar → abre ReservationModal pre-llenado ───────────────────────────

  const buildReservationInitial = (row) => {
    const dateStr = row.requestedDate?.split('T')[0] ?? row.requestedDate;
    return {
      title:          row.activityName,
      roomId:         '',   // se selecciona en el modal
      start:          `${dateStr}T${row.startTime}`,
      end:            `${dateStr}T${row.endTime}`,
      organizerName:  row.responsibleName,
      organizerEmail: '',
      description:    [
        `Área: ${row.area}`,
        `Aula preferida: ${row.preferredRoom}`,
        row.disposition && row.disposition !== 'N/A' ? `Disposición: ${row.disposition}` : null,
        row.resources ? `Recursos: ${row.resources}` : null,
        row.coffeeBreak ? `Coffee Break: ${row.coffeeBreakItems || 'Sí'}` : null,
      ].filter(Boolean).join('\n'),
    };
  };

  const handleReservationSaved = async () => {
    if (!approveRow) return;
    try {
      await roomRequestApi.updateStatus(approveRow.id, {
        status:        'Aprobada',
        adminNotes:    'Reserva creada desde gestión de solicitudes.',
        reservationId: null,
      });
    } catch { /* no crítico */ }
    setApproveRow(null);
    load();
  };

  // ── Rechazar ─────────────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!rejectRow) return;
    setActing(true);
    try {
      await roomRequestApi.updateStatus(rejectRow.id, {
        status:        'Rechazada',
        adminNotes:    rejectNotes.trim() || null,
        reservationId: null,
      });
      setRejectRow(null);
      setRejectNotes('');
      load();
    } catch {
      setError('No se pudo rechazar la solicitud.');
    } finally {
      setActing(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteRow) return;
    setActing(true);
    try {
      await roomRequestApi.delete(deleteRow.id);
      setDeleteRow(null);
      load();
    } catch {
      setError('No se pudo eliminar la solicitud.');
    } finally {
      setActing(false);
    }
  };

  const fmtDate = (dateStr) => {
    try {
      const d = dateStr?.includes('T') ? parseISO(dateStr) : new Date(dateStr + 'T00:00:00');
      return format(d, "d MMM yyyy", { locale: es });
    } catch { return dateStr ?? '—'; }
  };

  const fmtTime = (t) => (t ? t.slice(0, 5) : '—');

  const filteredRequests = tab ? requests.filter((r) => r.status === tab) : requests;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={1} mb={2}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PendingActionsIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Solicitudes de espacio</Typography>
            <Typography variant="body2" color="text.secondary">
              Gestiona las solicitudes de separación de sala — IMET
            </Typography>
          </Box>
          {loading && <CircularProgress size={18} />}
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small" sx={{ borderRadius: 2 }}>
          Actualizar
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={2}>
        {[
          { key: 'Pendiente', color: '#ed6c02' },
          { key: 'Aprobada',  color: '#2e7d32' },
          { key: 'Rechazada', color: '#d32f2f' },
        ].map(({ key, color }) => (
          <Paper key={key} elevation={0} sx={{ px: 2, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="body2" fontWeight={700}>{counts[key] ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">{STATUS_CONFIG[key].label}</Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
          variant="scrollable" scrollButtons="auto"
        >
          {TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>{t.label}</span>
                  {t.value && (counts[t.value] ?? 0) > 0 && (
                    <Chip
                      label={counts[t.value]}
                      size="small"
                      color={STATUS_CONFIG[t.value]?.color ?? 'default'}
                      sx={{ height: 18, fontSize: 11, fontWeight: 700 }}
                    />
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Área / Responsable</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Actividad</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Aula / Disposición</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Horario</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Asist.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>
                  <Tooltip title="Coffee Break"><CoffeeIcon fontSize="small" /></Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Estado</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {loading ? 'Cargando...' : 'No hay solicitudes en esta categoría.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredRequests.map((row) => {
                const sc = STATUS_CONFIG[row.status] ?? { color: 'default', label: row.status };
                return (
                  <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                        {row.responsibleName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {row.area}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                        {row.activityName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap>{row.preferredRoom}</Typography>
                      {row.disposition && row.disposition !== 'N/A' && (
                        <Typography variant="caption" color="text.secondary">{row.disposition}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{fmtDate(row.requestedDate)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {fmtTime(row.startTime)} – {fmtTime(row.endTime)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{row.attendeeCount}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {row.coffeeBreak
                        ? <CoffeeIcon fontSize="small" color="warning" />
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sc.label} color={sc.color} size="small" variant="outlined"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                      {row.adminNotes && (
                        <Tooltip title={row.adminNotes} placement="top">
                          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5, verticalAlign: 'middle' }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => setDetailRow(row)}>
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {row.status === 'Pendiente' && (
                          <Tooltip title="Aprobar y crear reserva">
                            <IconButton size="small" color="success" onClick={() => setApproveRow(row)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {row.status === 'Pendiente' && (
                          <Tooltip title="Rechazar">
                            <IconButton size="small" color="error" onClick={() => { setRejectRow(row); setRejectNotes(''); }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {row.status === 'Aprobada' && (
                          <Tooltip title="Ver en calendario">
                            <IconButton size="small" color="primary" href="/calendar">
                              <CalendarMonthIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => setDeleteRow(row)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Dialog: Detalle ─────────────────────────────────────────────── */}
      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Detalle de solicitud</DialogTitle>
        {detailRow && (
          <DialogContent dividers>
            <Stack spacing={1.5}>
              {[
                ['Área',           detailRow.area],
                ['Responsable',    detailRow.responsibleName],
                ['Actividad',      detailRow.activityName],
                ['Aula preferida', detailRow.preferredRoom],
                ['Disposición',    detailRow.disposition || 'N/A'],
                ['Fecha',          fmtDate(detailRow.requestedDate)],
                ['Horario',        `${fmtTime(detailRow.startTime)} – ${fmtTime(detailRow.endTime)}`],
                ['Asistentes',     detailRow.attendeeCount],
                ['Recursos',       detailRow.resources || '—'],
                ['Coffee Break',   detailRow.coffeeBreak ? 'Sí' : 'No'],
                ...(detailRow.coffeeBreak ? [['Ítems CB', detailRow.coffeeBreakItems || '—']] : []),
                ['Estado',         detailRow.status],
                ['Notas admin',    detailRow.adminNotes || '—'],
              ].map(([label, value]) => (
                <Stack key={label} direction="row" spacing={1}>
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 130, color: 'text.secondary', flexShrink: 0 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{value}</Typography>
                </Stack>
              ))}
            </Stack>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailRow(null)}>Cerrar</Button>
          {detailRow?.status === 'Pendiente' && (
            <Button
              variant="contained" color="success"
              onClick={() => { setApproveRow(detailRow); setDetailRow(null); }}
            >
              Aprobar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Rechazar ────────────────────────────────────────────── */}
      <Dialog open={!!rejectRow} onClose={() => setRejectRow(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            ¿Confirmas rechazar la solicitud de <strong>{rejectRow?.responsibleName}</strong> para <em>{rejectRow?.activityName}</em>?
          </Typography>
          <TextField
            label="Motivo del rechazo (opcional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            fullWidth multiline rows={2} size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectRow(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={acting}>
            {acting ? <CircularProgress size={18} /> : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Eliminar ────────────────────────────────────────────── */}
      <Dialog open={!!deleteRow} onClose={() => setDeleteRow(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Eliminar solicitud</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar la solicitud de <strong>{deleteRow?.responsibleName}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteRow(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={acting}>
            {acting ? <CircularProgress size={18} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── ReservationModal para aprobación ───────────────────────────── */}
      <ReservationModal
        open={!!approveRow}
        onClose={() => setApproveRow(null)}
        onSaved={handleReservationSaved}
        rooms={rooms}
        employees={employees}
        initial={approveRow ? buildReservationInitial(approveRow) : null}
      />
    </Box>
  );
}
