import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, IconButton, Tooltip, Grid, Avatar, Alert, Divider,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DirectionsCarIcon  from '@mui/icons-material/DirectionsCar';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import TableRowsIcon      from '@mui/icons-material/TableRows';
import DeleteIcon         from '@mui/icons-material/Delete';
import EditIcon           from '@mui/icons-material/Edit';
import PhotoCameraIcon    from '@mui/icons-material/PhotoCamera';
import { flotillaApi } from '../../api/pandoraApi';
import { useAuth, MODULES } from '../../hooks/useAuth.jsx';

const ESTADOS = ['Activa', 'En uso', 'Finalizada', 'Cancelada'];
const ESTADO_COLOR = { Activa: 'info', 'En uso': 'warning', Finalizada: 'success', Cancelada: 'default' };
const ESTADO_CAL_COLOR = { Activa: '#1565c0', 'En uso': '#e65100', Finalizada: '#2e7d32', Cancelada: '#9e9e9e' };
const GASOLINA = ['Lleno', '3/4', '1/2', '1/4', 'Reserva'];

// datetime-local <-> ISO UTC helpers
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fromLocalInput(val) {
  if (!val) return null;
  return new Date(val).toISOString();
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

const EMPTY_RESERVA = {
  vehiculoId: '', motivo: '', destino: '', conductor: '',
  solicitanteNombre: '', solicitanteEmail: '', pasajeros: '',
  startTime: '', endTime: '', estado: 'Activa',
  kmSalida: '', kmRegreso: '', nivelGasolinaSalida: '', notas: '',
};
const EMPTY_VEHICULO = {
  nombre: '', placa: '', marca: '', modelo: '', anio: '', color: '',
  capacidad: 5, colorEtiqueta: '#1565c0', notas: '', isActive: true, fotoBase64: null,
};

export default function FlotillaPage() {
  const { isAdmin } = useAuth();
  const canReserve = isAdmin || true; // la ruta ya exige el bit FLOTILLA

  const [tab,       setTab]       = useState(0);   // 0=Reservas, 1=Vehículos (admin)
  const [view,      setView]      = useState(1);   // 0=lista, 1=calendario
  const [vehiculos, setVehiculos] = useState([]);
  const [reservas,  setReservas]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [fVehiculo, setFVehiculo] = useState('');

  // Dialogs
  const [resDlg, setResDlg]       = useState(null);  // objeto reserva en edición/creación
  const [resSaving, setResSaving] = useState(false);
  const [resError, setResError]   = useState('');
  const [vehDlg, setVehDlg]       = useState(null);
  const [vehSaving, setVehSaving] = useState(false);

  const loadVehiculos = useCallback(async () => {
    try {
      const { data } = await flotillaApi.getVehiculos(isAdmin); // admin ve inactivos
      setVehiculos(data);
    } catch { setVehiculos([]); }
  }, [isAdmin]);

  const loadReservas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await flotillaApi.getReservas(undefined, undefined, fVehiculo || undefined);
      setReservas(data);
    } catch { setReservas([]); }
    finally { setLoading(false); }
  }, [fVehiculo]);

  useEffect(() => { loadVehiculos(); }, [loadVehiculos]);
  useEffect(() => { loadReservas(); }, [loadReservas]);

  // ── Reservas ──────────────────────────────────────────────────────────────
  const openNewReserva = (startISO) => {
    setResError('');
    setResDlg({
      ...EMPTY_RESERVA,
      vehiculoId: fVehiculo || (vehiculos[0]?.id ?? ''),
      startTime: startISO ? toLocalInput(startISO) : '',
      endTime: '',
    });
  };

  const openEditReserva = (r) => {
    setResError('');
    setResDlg({
      id: r.id, vehiculoId: r.vehiculoId, motivo: r.motivo, destino: r.destino || '',
      conductor: r.conductor || '', solicitanteNombre: r.solicitanteNombre || '',
      solicitanteEmail: r.solicitanteEmail || '', pasajeros: r.pasajeros || '',
      startTime: toLocalInput(r.startTime), endTime: toLocalInput(r.endTime),
      estado: r.estado || 'Activa', kmSalida: r.kmSalida ?? '', kmRegreso: r.kmRegreso ?? '',
      nivelGasolinaSalida: r.nivelGasolinaSalida || '', notas: r.notas || '',
    });
  };

  const saveReserva = async () => {
    const d = resDlg;
    setResError('');
    if (!d.vehiculoId) { setResError('Selecciona un vehículo.'); return; }
    if (!d.motivo.trim()) { setResError('El motivo es obligatorio.'); return; }
    if (!d.startTime || !d.endTime) { setResError('Indica inicio y fin.'); return; }
    if (new Date(d.startTime) >= new Date(d.endTime)) { setResError('El inicio debe ser antes del fin.'); return; }

    const payload = {
      vehiculoId: d.vehiculoId,
      motivo: d.motivo.trim(),
      destino: d.destino || null,
      conductor: d.conductor || null,
      solicitanteNombre: d.solicitanteNombre || null,
      solicitanteEmail: d.solicitanteEmail || null,
      pasajeros: d.pasajeros || null,
      startTime: fromLocalInput(d.startTime),
      endTime: fromLocalInput(d.endTime),
      estado: d.estado || 'Activa',
      kmSalida: d.kmSalida === '' ? null : Number(d.kmSalida),
      kmRegreso: d.kmRegreso === '' ? null : Number(d.kmRegreso),
      nivelGasolinaSalida: d.nivelGasolinaSalida || null,
      notas: d.notas || null,
    };
    setResSaving(true);
    try {
      if (d.id) await flotillaApi.updateReserva(d.id, payload);
      else      await flotillaApi.createReserva(payload);
      setResDlg(null);
      loadReservas();
    } catch (e) {
      const msg = e?.response?.data || e?.message || 'Error al guardar.';
      setResError(typeof msg === 'string' ? msg : 'El vehículo ya está reservado en ese horario.');
    } finally { setResSaving(false); }
  };

  const deleteReserva = async (id) => {
    if (!window.confirm('¿Eliminar esta reserva?')) return;
    try { await flotillaApi.deleteReserva(id); loadReservas(); } catch {}
  };

  // ── Vehículos (admin) ───────────────────────────────────────────────────────
  const openNewVehiculo = () => setVehDlg({ ...EMPTY_VEHICULO });
  const openEditVehiculo = (v) => setVehDlg({
    id: v.id, nombre: v.nombre, placa: v.placa || '', marca: v.marca || '',
    modelo: v.modelo || '', anio: v.anio ?? '', color: v.color || '',
    capacidad: v.capacidad ?? 5, colorEtiqueta: v.colorEtiqueta || '#1565c0',
    notas: v.notas || '', isActive: v.isActive, fotoBase64: null, hasFoto: v.hasFoto,
  });

  const onFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setVehDlg(prev => ({ ...prev, fotoBase64: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveVehiculo = async () => {
    const d = vehDlg;
    if (!d.nombre.trim()) return;
    const payload = {
      nombre: d.nombre.trim(), placa: d.placa || null, marca: d.marca || null,
      modelo: d.modelo || null, anio: d.anio === '' ? null : Number(d.anio),
      color: d.color || null, capacidad: Number(d.capacidad) || 5,
      colorEtiqueta: d.colorEtiqueta || null, notas: d.notas || null,
      isActive: d.isActive, fotoBase64: d.fotoBase64, // null = no tocar, "data:..." = set
    };
    setVehSaving(true);
    try {
      if (d.id) await flotillaApi.updateVehiculo(d.id, payload);
      else      await flotillaApi.createVehiculo(payload);
      setVehDlg(null);
      loadVehiculos();
    } catch {} finally { setVehSaving(false); }
  };

  const deleteVehiculo = async (id) => {
    if (!window.confirm('¿Desactivar este vehículo? No se eliminarán sus reservas.')) return;
    try { await flotillaApi.deleteVehiculo(id); loadVehiculos(); } catch {}
  };

  // Eventos para FullCalendar
  const calEvents = reservas.map(r => ({
    id: r.id,
    title: `🚗 ${r.vehiculoNombre || 'Vehículo'} — ${r.motivo}`,
    start: r.startTime,
    end: r.endTime,
    backgroundColor: r.vehiculoColor || ESTADO_CAL_COLOR[r.estado] || '#1565c0',
    borderColor: r.vehiculoColor || ESTADO_CAL_COLOR[r.estado] || '#1565c0',
    extendedProps: r,
  }));

  const vehiculoById = (id) => vehiculos.find(v => v.id === id);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <DirectionsCarIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Flotilla — Reserva de Vehículos</Typography>
            {loading && <CircularProgress size={18} />}
          </Stack>
          {tab === 0 && canReserve && vehiculos.length > 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openNewReserva()} sx={{ borderRadius: 2 }}>
              Nueva reserva
            </Button>
          )}
          {tab === 1 && isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewVehiculo} sx={{ borderRadius: 2 }}>
              Nuevo vehículo
            </Button>
          )}
        </Stack>
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5 }}>
        <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Reservas" />
        {isAdmin && <Tab icon={<DirectionsCarIcon fontSize="small" />} iconPosition="start" label="Vehículos" />}
      </Tabs>

      {/* ════════════ TAB RESERVAS ════════════ */}
      {tab === 0 && (
        <>
          {vehiculos.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No hay vehículos registrados todavía.{isAdmin ? ' Ve a la pestaña "Vehículos" para agregar el primero.' : ' Pide a un administrador que registre un vehículo.'}
            </Alert>
          ) : (
            <>
              <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" alignItems="center">
                <TextField select size="small" label="Vehículo" value={fVehiculo}
                  onChange={e => setFVehiculo(e.target.value)} sx={{ minWidth: 200 }}>
                  <MenuItem value="">Todos</MenuItem>
                  {vehiculos.map(v => <MenuItem key={v.id} value={v.id}>{v.nombre}{v.placa ? ` (${v.placa})` : ''}</MenuItem>)}
                </TextField>
                <Box flexGrow={1} />
                <Tabs value={view} onChange={(_, v) => setView(v)}>
                  <Tab icon={<TableRowsIcon fontSize="small" />} iconPosition="start" label="Lista" />
                  <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Calendario" />
                </Tabs>
              </Stack>

              {view === 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          {['Vehículo', 'Motivo', 'Destino', 'Conductor', 'Inicio', 'Fin', 'Estado', ''].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reservas.length === 0 && (
                          <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            {loading ? 'Cargando…' : 'No hay reservas en este periodo'}
                          </TableCell></TableRow>
                        )}
                        {reservas.map(r => (
                          <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEditReserva(r)}>
                            <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                              <Chip size="small" label={r.vehiculoNombre} sx={{ bgcolor: r.vehiculoColor || '#1565c0', color: '#fff' }} />
                            </TableCell>
                            <TableCell>{r.motivo}</TableCell>
                            <TableCell><Typography variant="caption">{r.destino || '—'}</Typography></TableCell>
                            <TableCell><Typography variant="caption">{r.conductor || '—'}</Typography></TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="caption">{fmtDate(r.startTime)}</Typography></TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="caption">{fmtDate(r.endTime)}</Typography></TableCell>
                            <TableCell><Chip size="small" label={r.estado} color={ESTADO_COLOR[r.estado] || 'default'} /></TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Tooltip title="Editar"><IconButton size="small" onClick={() => openEditReserva(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => deleteReserva(r.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {view === 1 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2 }}>
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={esLocale}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' }}
                    events={calEvents}
                    selectable={canReserve}
                    select={(info) => openNewReserva(info.startStr)}
                    eventClick={({ event }) => openEditReserva(event.extendedProps)}
                    height="auto"
                    eventDisplay="block"
                  />
                </Paper>
              )}
            </>
          )}
        </>
      )}

      {/* ════════════ TAB VEHÍCULOS (admin) ════════════ */}
      {tab === 1 && isAdmin && (
        <Grid container spacing={1.5}>
          {vehiculos.length === 0 && (
            <Grid item xs={12}><Alert severity="info" sx={{ borderRadius: 2 }}>Aún no hay vehículos. Agrega el primero con "Nuevo vehículo".</Alert></Grid>
          )}
          {vehiculos.map(v => (
            <Grid item xs={12} sm={6} md={4} key={v.id}>
              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.5, opacity: v.isActive ? 1 : 0.55 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar variant="rounded" src={v.hasFoto ? flotillaApi.getFotoUrl(v.id) : undefined}
                    sx={{ width: 56, height: 56, bgcolor: v.colorEtiqueta || '#1565c0' }}>
                    <DirectionsCarIcon />
                  </Avatar>
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{v.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {[v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || '—'}
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                      {v.placa && <Chip size="small" label={v.placa} variant="outlined" />}
                      <Chip size="small" label={`${v.capacidad} pas.`} variant="outlined" />
                      {!v.isActive && <Chip size="small" label="Inactivo" color="default" />}
                    </Stack>
                  </Box>
                  <Stack>
                    <IconButton size="small" onClick={() => openEditVehiculo(v)}><EditIcon fontSize="small" /></IconButton>
                    {v.isActive && <IconButton size="small" color="error" onClick={() => deleteVehiculo(v.id)}><DeleteIcon fontSize="small" /></IconButton>}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ════════════ DIÁLOGO RESERVA ════════════ */}
      <Dialog open={!!resDlg} onClose={() => setResDlg(null)} fullWidth maxWidth="sm">
        <DialogTitle>{resDlg?.id ? 'Editar reserva' : 'Nueva reserva de vehículo'}</DialogTitle>
        <DialogContent dividers>
          {resError && <Alert severity="error" sx={{ mb: 1.5 }}>{resError}</Alert>}
          {resDlg && (
            <Grid container spacing={1.5} sx={{ mt: 0 }}>
              <Grid item xs={12}>
                <TextField select fullWidth size="small" label="Vehículo *" value={resDlg.vehiculoId}
                  onChange={e => setResDlg({ ...resDlg, vehiculoId: e.target.value })}>
                  {vehiculos.filter(v => v.isActive).map(v => (
                    <MenuItem key={v.id} value={v.id}>{v.nombre}{v.placa ? ` (${v.placa})` : ''} · {v.capacidad} pas.</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Motivo del viaje *" value={resDlg.motivo}
                  onChange={e => setResDlg({ ...resDlg, motivo: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Destino" value={resDlg.destino}
                  onChange={e => setResDlg({ ...resDlg, destino: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" type="datetime-local" label="Inicio *" InputLabelProps={{ shrink: true }}
                  value={resDlg.startTime} onChange={e => setResDlg({ ...resDlg, startTime: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" type="datetime-local" label="Fin *" InputLabelProps={{ shrink: true }}
                  value={resDlg.endTime} onChange={e => setResDlg({ ...resDlg, endTime: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Conductor" value={resDlg.conductor}
                  onChange={e => setResDlg({ ...resDlg, conductor: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Pasajeros / acompañantes" value={resDlg.pasajeros}
                  onChange={e => setResDlg({ ...resDlg, pasajeros: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Solicitante" value={resDlg.solicitanteNombre}
                  onChange={e => setResDlg({ ...resDlg, solicitanteNombre: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" type="email" label="Correo solicitante" value={resDlg.solicitanteEmail}
                  onChange={e => setResDlg({ ...resDlg, solicitanteEmail: e.target.value })}
                  helperText="Recibirá confirmación por correo" />
              </Grid>

              <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Control de uso (opcional)</Typography></Divider></Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="number" label="Km salida" value={resDlg.kmSalida}
                  onChange={e => setResDlg({ ...resDlg, kmSalida: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="number" label="Km regreso" value={resDlg.kmRegreso}
                  onChange={e => setResDlg({ ...resDlg, kmRegreso: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth size="small" label="Gasolina" value={resDlg.nivelGasolinaSalida}
                  onChange={e => setResDlg({ ...resDlg, nivelGasolinaSalida: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {GASOLINA.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth size="small" label="Estado" value={resDlg.estado}
                  onChange={e => setResDlg({ ...resDlg, estado: e.target.value })}>
                  {ESTADOS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" multiline minRows={2} label="Notas" value={resDlg.notas}
                  onChange={e => setResDlg({ ...resDlg, notas: e.target.value })} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResDlg(null)}>Cancelar</Button>
          <Button variant="contained" onClick={saveReserva} disabled={resSaving}
            startIcon={resSaving ? <CircularProgress size={16} /> : null}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ════════════ DIÁLOGO VEHÍCULO (admin) ════════════ */}
      <Dialog open={!!vehDlg} onClose={() => setVehDlg(null)} fullWidth maxWidth="sm">
        <DialogTitle>{vehDlg?.id ? 'Editar vehículo' : 'Nuevo vehículo'}</DialogTitle>
        <DialogContent dividers>
          {vehDlg && (
            <Grid container spacing={1.5} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth size="small" label="Nombre / alias *" value={vehDlg.nombre}
                  onChange={e => setVehDlg({ ...vehDlg, nombre: e.target.value })}
                  helperText="Ej. Camioneta blanca, Nissan iMET" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Placa" value={vehDlg.placa}
                  onChange={e => setVehDlg({ ...vehDlg, placa: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Marca" value={vehDlg.marca}
                  onChange={e => setVehDlg({ ...vehDlg, marca: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Modelo" value={vehDlg.modelo}
                  onChange={e => setVehDlg({ ...vehDlg, modelo: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" type="number" label="Año" value={vehDlg.anio}
                  onChange={e => setVehDlg({ ...vehDlg, anio: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Color" value={vehDlg.color}
                  onChange={e => setVehDlg({ ...vehDlg, color: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" type="number" label="Capacidad" value={vehDlg.capacidad}
                  onChange={e => setVehDlg({ ...vehDlg, capacidad: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" type="color" label="Color etiqueta" InputLabelProps={{ shrink: true }}
                  value={vehDlg.colorEtiqueta} onChange={e => setVehDlg({ ...vehDlg, colorEtiqueta: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />} sx={{ borderRadius: 2 }}>
                  {vehDlg.fotoBase64 ? 'Foto seleccionada' : (vehDlg.hasFoto ? 'Cambiar foto' : 'Subir foto')}
                  <input hidden type="file" accept="image/*" onChange={onFotoChange} />
                </Button>
                {vehDlg.fotoBase64 && (
                  <Avatar variant="rounded" src={vehDlg.fotoBase64} sx={{ width: 64, height: 64, mt: 1 }} />
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" multiline minRows={2} label="Notas" value={vehDlg.notas}
                  onChange={e => setVehDlg({ ...vehDlg, notas: e.target.value })} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehDlg(null)}>Cancelar</Button>
          <Button variant="contained" onClick={saveVehiculo} disabled={vehSaving}
            startIcon={vehSaving ? <CircularProgress size={16} /> : null}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
