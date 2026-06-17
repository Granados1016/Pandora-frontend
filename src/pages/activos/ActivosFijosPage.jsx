import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, Stack,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, LinearProgress, Alert, Tabs, Tab, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
  InputAdornment,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon         from '@mui/icons-material/Search';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import SwapHorizIcon      from '@mui/icons-material/SwapHoriz';
import BuildIcon          from '@mui/icons-material/Build';
import InfoIcon           from '@mui/icons-material/Info';
import DownloadIcon       from '@mui/icons-material/Download';
import { activosFijosApi } from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth';

const STATUS_COLORS = {
  Activo: 'success', 'Dado de Baja': 'error', 'En Mantenimiento': 'warning', 'En Bodega': 'default',
};
const STATUSES = ['Activo', 'En Mantenimiento', 'En Bodega', 'Dado de Baja'];
const METHODS  = ['Lineal', 'Doble Saldo Decreciente', 'Suma de Dígitos'];
const MOV_TYPES = ['Mantenimiento', 'Transferencia', 'Depreciacion', 'Baja', 'Otro'];

const emptyActivo = () => ({
  assetNumber: '', name: '', description: '', category: '', brand: '', model: '',
  serialNumber: '', department: '', responsibleUser: '', location: '',
  status: 'Activo', purchaseDate: '', purchaseCost: '', usefulLifeYears: '',
  depreciationMethod: 'Lineal', residualValue: '0', notes: '',
});

const emptyMov = () => ({ type: 'Mantenimiento', description: '', amount: '', fromDept: '', toDept: '' });

export default function ActivosFijosPage() {
  const { isAdmin } = useAuth();
  const [list, setList]             = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [tab, setTab]               = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [form, setForm]             = useState(emptyActivo());
  const [openForm, setOpenForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [detail, setDetail]         = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [movForm, setMovForm]       = useState(emptyMov());
  const [openMov, setOpenMov]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSearch) params.search = filterSearch;
      const [listRes, statsRes] = await Promise.all([
        activosFijosApi.getAll(params),
        activosFijosApi.getStats(),
      ]);
      setList(listRes.data);
      setStats(statsRes.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterStatus, filterSearch]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n) => n != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n) : '—';

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        purchaseCost:     form.purchaseCost    ? parseFloat(form.purchaseCost)    : null,
        usefulLifeYears:  form.usefulLifeYears ? parseInt(form.usefulLifeYears)   : null,
        residualValue:    parseFloat(form.residualValue || '0'),
        purchaseDate:     form.purchaseDate    || null,
      };
      if (editing) await activosFijosApi.update(editing, data);
      else         await activosFijosApi.create(data);
      setOpenForm(false); setEditing(null); setForm(emptyActivo()); load();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Dar de baja este activo?')) return;
    try { await activosFijosApi.remove(id); load(); }
    catch (e) { setError(e.message); }
  };

  const handleOpenDetail = async (id) => {
    try {
      const res = await activosFijosApi.getById(id);
      setDetail(res.data);
      setOpenDetail(true);
    } catch (e) { setError(e.message); }
  };

  const handleAddMov = async () => {
    if (!detail) return;
    try {
      const data = {
        ...movForm,
        amount: movForm.amount ? parseFloat(movForm.amount) : null,
      };
      await activosFijosApi.addMovimiento(detail.activo.id, data);
      const res = await activosFijosApi.getById(detail.activo.id);
      setDetail(res.data);
      setOpenMov(false);
      setMovForm(emptyMov());
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1}>
          <AccountBalanceIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>Activos Fijos</Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          {isAdmin && (
            <Tooltip title="Exportar Excel">
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={async () => {
                try {
                  const res = await activosFijosApi.exportExcel({ status: filterStatus || undefined });
                  const url = URL.createObjectURL(res.data);
                  const a = document.createElement('a'); a.href = url; a.download = `activos_fijos_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
                  URL.revokeObjectURL(url);
                } catch {}
              }}>Excel</Button>
            </Tooltip>
          )}
          {isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { setForm(emptyActivo()); setEditing(null); setOpenForm(true); }}>
              Nuevo Activo
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Activos" />
        <Tab label="Resumen" />
      </Tabs>

      {tab === 0 && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
            <TextField size="small" placeholder="Buscar por nombre, marca, serie..." value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
              sx={{ flex: 1 }} />
            <TextField size="small" select label="Estado" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">Todos</MenuItem>
              {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>

          {loading ? <LinearProgress /> : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Departamento</TableCell>
                    <TableCell align="right">Costo</TableCell>
                    <TableCell align="right">Valor Actual</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay activos registrados.
                      </TableCell>
                    </TableRow>
                  )}
                  {list.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell>{a.assetNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{a.name}</Typography>
                        {a.brand && <Typography variant="caption" color="text.secondary">{a.brand} {a.model}</Typography>}
                      </TableCell>
                      <TableCell>{a.category || '—'}</TableCell>
                      <TableCell>{a.department || '—'}</TableCell>
                      <TableCell align="right">{fmt(a.purchaseCost)}</TableCell>
                      <TableCell align="right">{fmt(a.currentValue)}</TableCell>
                      <TableCell>
                        <Chip label={a.status} size="small" color={STATUS_COLORS[a.status] || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" onClick={() => handleOpenDetail(a.id)}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isAdmin && <>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => {
                                setForm({
                                  assetNumber: a.assetNumber, name: a.name,
                                  description: a.description || '', category: a.category || '',
                                  brand: a.brand || '', model: a.model || '',
                                  serialNumber: a.serialNumber || '', department: a.department || '',
                                  responsibleUser: a.responsibleUser || '', location: a.location || '',
                                  status: a.status,
                                  purchaseDate: a.purchaseDate?.slice(0,10) || '',
                                  purchaseCost: a.purchaseCost?.toString() || '',
                                  usefulLifeYears: a.usefulLifeYears?.toString() || '',
                                  depreciationMethod: a.depreciationMethod || 'Lineal',
                                  residualValue: a.residualValue?.toString() || '0',
                                  notes: a.notes || '',
                                });
                                setEditing(a.id); setOpenForm(true);
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {tab === 1 && stats && (
        <Grid container spacing={2}>
          {[
            { label: 'Total activos', value: stats.total,           color: 'primary.main' },
            { label: 'Activos',       value: stats.activos,         color: 'success.main' },
            { label: 'En Mantenimiento', value: stats.enMantenimiento, color: 'warning.main' },
            { label: 'Dados de Baja', value: stats.dadosDeBaja,     color: 'error.main' },
          ].map(({ label, value, color }) => (
            <Grid item xs={6} md={3} key={label}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {[
            { label: 'Costo total de adquisición', value: fmt(stats.totalCosto) },
            { label: 'Depreciación acumulada',      value: fmt(stats.totalDepreciacion) },
            { label: 'Valor en libros actual',      value: fmt(stats.totalValorActual) },
          ].map(({ label, value }) => (
            <Grid item xs={12} md={4} key={label}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                  <Typography variant="h6" fontWeight={600}>{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Form Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Editar Activo' : 'Nuevo Activo Fijo'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <Stack direction="row" gap={2}>
              <TextField label="Número de activo" value={form.assetNumber} onChange={e => setForm(f => ({ ...f, assetNumber: e.target.value }))} fullWidth placeholder="Auto-generado si se deja vacío" />
              <TextField label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField label="Categoría" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} fullWidth />
              <TextField label="Marca" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} fullWidth />
              <TextField label="Modelo" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField label="Número de serie" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} fullWidth />
              <TextField label="Departamento" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} fullWidth />
              <TextField label="Responsable" value={form.responsibleUser} onChange={e => setForm(f => ({ ...f, responsibleUser: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField label="Ubicación" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} fullWidth />
              <TextField select label="Estado" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} fullWidth>
                {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Información financiera</Typography>
            <Stack direction="row" gap={2}>
              <TextField label="Fecha de compra" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Costo de compra" type="number" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField label="Vida útil (años)" type="number" value={form.usefulLifeYears} onChange={e => setForm(f => ({ ...f, usefulLifeYears: e.target.value }))} fullWidth />
              <TextField select label="Método depreciación" value={form.depreciationMethod} onChange={e => setForm(f => ({ ...f, depreciationMethod: e.target.value }))} fullWidth>
                {METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField label="Valor residual" type="number" value={form.residualValue} onChange={e => setForm(f => ({ ...f, residualValue: e.target.value }))} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Stack>
            <TextField label="Notas" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} fullWidth multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      {detail && (
        <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">{detail.activo.name}</Typography>
              <Chip label={detail.activo.status} size="small" color={STATUS_COLORS[detail.activo.status] || 'default'} />
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} mb={2}>
              {[
                ['Número',       detail.activo.assetNumber],
                ['Marca/Modelo', [detail.activo.brand, detail.activo.model].filter(Boolean).join(' ')],
                ['Serie',        detail.activo.serialNumber],
                ['Categoría',    detail.activo.category],
                ['Departamento', detail.activo.department],
                ['Responsable',  detail.activo.responsibleUser],
                ['Ubicación',    detail.activo.location],
                ['Costo',        detail.activo.purchaseCost != null ? fmt(detail.activo.purchaseCost) : null],
                ['Depreciación', detail.activo.accumulatedDeprec != null ? fmt(detail.activo.accumulatedDeprec) : null],
                ['Valor actual', detail.activo.currentValue != null ? fmt(detail.activo.currentValue) : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <Grid item xs={6} md={4} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value}</Typography>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2">Historial de movimientos</Typography>
              {isAdmin && (
                <Button size="small" startIcon={<AddIcon />} variant="outlined"
                  onClick={() => setOpenMov(true)}>
                  Registrar movimiento
                </Button>
              )}
            </Stack>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Registrado por</TableCell>
                    <TableCell>Fecha</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.movimientos.map(m => (
                    <TableRow key={m.id}>
                      <TableCell><Chip label={m.type} size="small" /></TableCell>
                      <TableCell>{m.description || '—'}</TableCell>
                      <TableCell align="right">{m.amount != null ? fmt(m.amount) : '—'}</TableCell>
                      <TableCell>{m.createdBy}</TableCell>
                      <TableCell>{new Date(m.createdAt).toLocaleDateString('es-MX')}</TableCell>
                    </TableRow>
                  ))}
                  {detail.movimientos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">Sin movimientos registrados</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDetail(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Movimiento Dialog */}
      <Dialog open={openMov} onClose={() => setOpenMov(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Movimiento</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField select label="Tipo *" value={movForm.type} onChange={e => setMovForm(f => ({ ...f, type: e.target.value }))} fullWidth>
              {MOV_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Descripción" value={movForm.description} onChange={e => setMovForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={2} />
            {(movForm.type === 'Depreciacion' || movForm.type === 'Mantenimiento') && (
              <TextField label="Monto ($)" type="number" value={movForm.amount} onChange={e => setMovForm(f => ({ ...f, amount: e.target.value }))} fullWidth />
            )}
            {movForm.type === 'Transferencia' && (
              <Stack direction="row" gap={2}>
                <TextField label="Departamento origen" value={movForm.fromDept} onChange={e => setMovForm(f => ({ ...f, fromDept: e.target.value }))} fullWidth />
                <TextField label="Departamento destino *" value={movForm.toDept} onChange={e => setMovForm(f => ({ ...f, toDept: e.target.value }))} fullWidth />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMov(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddMov}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
