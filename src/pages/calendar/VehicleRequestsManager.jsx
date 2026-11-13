import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, IconButton, Tooltip, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Tabs, Tab,
} from '@mui/material';
import PendingActionsIcon  from '@mui/icons-material/PendingActions';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import CancelIcon          from '@mui/icons-material/Cancel';
import DeleteIcon          from '@mui/icons-material/Delete';
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined';
import RefreshIcon         from '@mui/icons-material/Refresh';
import DirectionsCarIcon   from '@mui/icons-material/DirectionsCar';
import { format, parseISO } from 'date-fns';
import { es }              from 'date-fns/locale';
import { vehicleRequestApi, flotillaApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const STATUS_CONFIG = {
  Pendiente: { color: 'warning',  label: 'Pendiente' },
  Aprobada:  { color: 'success',  label: 'Aprobada'  },
  Rechazada: { color: 'error',    label: 'Rechazada' },
};

const TABS = [
  { value: '',          label: 'Todas'      },
  { value: 'Pendiente', label: 'Pendientes' },
  { value: 'Aprobada',  label: 'Aprobadas'  },
  { value: 'Rechazada', label: 'Rechazadas' },
];

export default function VehicleRequestsManager() {
  const [requests, setRequests] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState('');
  const [error, setError]       = useState('');

  const [detailRow, setDetailRow]     = useState(null);
  const [rejectRow, setRejectRow]     = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveRow, setApproveRow]   = useState(null);
  const [approveVehiculo, setApproveVehiculo] = useState('');
  const [approveNotes, setApproveNotes]       = useState('');
  const [approveError, setApproveError]       = useState('');
  const [deleteRow, setDeleteRow]     = useState(null);
  const [acting, setActing]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await vehicleRequestApi.getAll(tab || undefined);
      setRequests(res.data);
    } catch (e) {
      setError(`No se pudieron cargar las solicitudes: ${apiError(e, e.message || 'Error desconocido')}`);
    } finally {
      setLoading(false);
    }
    try {
      const vr = await flotillaApi.getVehiculos();
      setVehiculos(vr.data);
    } catch { /* opcional */ }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  // ── Aprobar ───────────────────────────────────────────────────────────────
  const openApprove = (row) => {
    setApproveRow(row);
    setApproveVehiculo(row.vehiculoIdPreferido || '');
    setApproveNotes('');
    setApproveError('');
  };

  const handleApprove = async () => {
    if (!approveRow) return;
    if (!approveVehiculo) { setApproveError('Selecciona el vehículo que asignas.'); return; }
    setActing(true);
    setApproveError('');
    try {
      await vehicleRequestApi.updateStatus(approveRow.id, {
        status:     'Aprobada',
        adminNotes: approveNotes.trim() || null,
        vehiculoId: approveVehiculo,
      });
      setApproveRow(null);
      load();
    } catch (e) {
      setApproveError(apiError(e, 'No se pudo aprobar. ¿Hay choque de horario con otra reserva?'));
    } finally {
      setActing(false);
    }
  };

  // ── Rechazar ──────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectRow) return;
    setActing(true);
    try {
      await vehicleRequestApi.updateStatus(rejectRow.id, {
        status:     'Rechazada',
        adminNotes: rejectNotes.trim() || null,
        vehiculoId: null,
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

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteRow) return;
    setActing(true);
    try {
      await vehicleRequestApi.delete(deleteRow.id);
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
      return format(d, 'd MMM yyyy', { locale: es });
    } catch { return dateStr ?? '—'; }
  };
  const fmtTime = (t) => (t ? t.slice(0, 5) : '—');

  const filteredRequests = tab ? requests.filter((r) => r.status === tab) : requests;

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Resumen */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={2} alignItems="center">
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
        <Box flexGrow={1} />
        {loading && <CircularProgress size={18} />}
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small" sx={{ borderRadius: 2 }}>
          Actualizar
        </Button>
      </Stack>

      {/* Tabla */}
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
                    <Chip label={counts[t.value]} size="small" color={STATUS_CONFIG[t.value]?.color ?? 'default'} sx={{ height: 18, fontSize: 11, fontWeight: 700 }} />
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
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Motivo</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Vehículo / Destino</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Horario</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Estado</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {loading ? 'Cargando...' : 'No hay solicitudes de vehículo en esta categoría.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredRequests.map((row) => {
                const sc = STATUS_CONFIG[row.status] ?? { color: 'default', label: row.status };
                return (
                  <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>{row.responsibleName}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{row.area}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{row.motivo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap>{row.vehiculoPreferido || 'Sin preferencia'}</Typography>
                      {row.destino && <Typography variant="caption" color="text.secondary" noWrap display="block">→ {row.destino}</Typography>}
                    </TableCell>
                    <TableCell><Typography variant="body2" noWrap>{fmtDate(row.requestedDate)}</Typography></TableCell>
                    <TableCell><Typography variant="body2" noWrap>{fmtTime(row.startTime)} – {fmtTime(row.endTime)}</Typography></TableCell>
                    <TableCell>
                      <Chip label={sc.label} color={sc.color} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} />
                      {row.adminNotes && (
                        <Tooltip title={row.adminNotes} placement="top">
                          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5, verticalAlign: 'middle' }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => setDetailRow(row)}><InfoOutlinedIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {row.status === 'Pendiente' && (
                          <Tooltip title="Aprobar y crear reserva">
                            <IconButton size="small" color="success" onClick={() => openApprove(row)}><CheckCircleIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                        {row.status === 'Pendiente' && (
                          <Tooltip title="Rechazar">
                            <IconButton size="small" color="error" onClick={() => { setRejectRow(row); setRejectNotes(''); }}><CancelIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                        {row.status === 'Aprobada' && (
                          <Tooltip title="Ver en Flotilla">
                            <IconButton size="small" color="primary" href="/flotilla"><DirectionsCarIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => setDeleteRow(row)}><DeleteIcon fontSize="small" /></IconButton>
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

      {/* Detalle */}
      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Detalle de solicitud</DialogTitle>
        {detailRow && (
          <DialogContent dividers>
            <Stack spacing={1.5}>
              {[
                ['Área',             detailRow.area],
                ['Responsable',      detailRow.responsibleName],
                ['Correo',           detailRow.solicitanteEmail || '—'],
                ['Motivo',           detailRow.motivo],
                ['Vehículo preferido', detailRow.vehiculoPreferido || 'Sin preferencia'],
                ['Destino',          detailRow.destino || '—'],
                ['Conductor',        detailRow.conductor || '—'],
                ['Pasajeros',        detailRow.pasajeros || '—'],
                ['Fecha',            fmtDate(detailRow.requestedDate)],
                ['Horario',          `${fmtTime(detailRow.startTime)} – ${fmtTime(detailRow.endTime)}`],
                ['Estado',           detailRow.status],
                ['Notas admin',      detailRow.adminNotes || '—'],
              ].map(([label, value]) => (
                <Stack key={label} direction="row" spacing={1}>
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 140, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{value}</Typography>
                </Stack>
              ))}
            </Stack>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailRow(null)}>Cerrar</Button>
          {detailRow?.status === 'Pendiente' && (
            <Button variant="contained" color="success" onClick={() => { openApprove(detailRow); setDetailRow(null); }}>Aprobar</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Aprobar */}
      <Dialog open={!!approveRow} onClose={() => setApproveRow(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Aprobar y asignar vehículo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Al aprobar se creará la reserva de vehículo para <strong>{approveRow?.responsibleName}</strong> — <em>{approveRow?.motivo}</em>.
          </Typography>
          {approveError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{approveError}</Alert>}
          <TextField
            select fullWidth size="small" label="Vehículo asignado *"
            value={approveVehiculo} onChange={(e) => setApproveVehiculo(e.target.value)}
            sx={{ mb: 2 }}
          >
            {vehiculos.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.nombre}{v.placa ? ` — ${v.placa}` : ''}{v.capacidad ? ` (${v.capacidad} pas.)` : ''}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notas (opcional)" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)}
            fullWidth multiline rows={2} size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveRow(null)}>Cancelar</Button>
          <Button color="success" variant="contained" onClick={handleApprove} disabled={acting}>
            {acting ? <CircularProgress size={18} /> : 'Aprobar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rechazar */}
      <Dialog open={!!rejectRow} onClose={() => setRejectRow(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            ¿Confirmas rechazar la solicitud de <strong>{rejectRow?.responsibleName}</strong> para <em>{rejectRow?.motivo}</em>?
          </Typography>
          <TextField
            label="Motivo del rechazo (opcional)" value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)}
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

      {/* Eliminar */}
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
    </Box>
  );
}
