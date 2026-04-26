import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Stack, Divider,
  InputAdornment, Grid, Tabs, Tab, Switch, FormControlLabel,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { inventoryApi, catalogApi } from '../../api/pandoraApi';
import ExcelImportDialog from '../../components/inventory/ExcelImportDialog';
import { apiError } from '../../api/apiError';

// ─── Constantes ──────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 1, label: 'Activo',        color: 'success' },
  { value: 2, label: 'Mantenimiento', color: 'warning' },
  { value: 3, label: 'Dado de baja',  color: 'error' },
  { value: 4, label: 'En almacén',    color: 'default' },
];

const statusLabel = (s) => STATUS_OPTIONS.find(o => o.label === s || o.value === s)?.label ?? s;
const statusColor = (s) => STATUS_OPTIONS.find(o => o.label === s || o.value === s)?.color ?? 'default';

const EMPTY_ITEM = {
  inventoryNumber: '', name: '', brand: '', model: '', serialNumber: '',
  accessories: '', assignedTo: '', _employeeId: null, department: '', _deptId: null,
  status: 1, inventoryTypeId: '',
  purchaseDate: '', purchasePrice: '',
  decommissionDate: '', decommissionReason: '',
  isPhone: false, phoneNumber: '', imei: '', pinPattern: '',
};

const EMPTY_TRANSFER = { toPerson: '', toDepartment: '', notes: '' };

const fmt = (n) => n != null
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
  : '—';

const toInputDate = (d) => d ? d.slice(0, 10) : '';

// ─── Componente ──────────────────────────────────────────────────────────────
export default function InventoryItems() {
  const [items, setItems]       = useState([]);
  const [types, setTypes]       = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Filtros
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dialog item
  const [openItem, setOpenItem] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_ITEM);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [generatingNum, setGeneratingNum] = useState(false);

  // Excel
  const [openImport, setOpenImport] = useState(false);

  // Dialog historial / transferencia
  const [openHistory, setOpenHistory]     = useState(false);
  const [historyItem, setHistoryItem]     = useState(null);
  const [transfers, setTransfers]         = useState([]);
  const [loadingHist, setLoadingHist]     = useState(false);
  const [openTransfer, setOpenTransfer]   = useState(false);
  const [transferForm, setTransferForm]   = useState(EMPTY_TRANSFER);
  const [sendingTransfer, setSendingTransfer] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      inventoryApi.getItems(),
      inventoryApi.getTypes(),
      catalogApi.getEmployees(),
      catalogApi.getDepartments(),
    ])
      .then(([ir, tr, er, dr]) => {
        setItems(ir.data);
        setTypes(tr.data);
        setEmployees(er.data);
        setDepartments(dr.data);
      })
      .catch(() => setError('Error al cargar datos.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Filtrado local
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || [i.inventoryNumber, i.name, i.brand, i.model, i.serialNumber, i.assignedTo, i.department]
      .some(v => v?.toLowerCase().includes(q));
    const matchType   = !filterType   || i.inventoryTypeId === filterType;
    const matchStatus = !filterStatus || i.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // ─── Dialog CRUD ────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_ITEM);
    setActiveTab(0);
    setOpenItem(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      inventoryNumber:   item.inventoryNumber,
      name:              item.name,
      brand:             item.brand,
      model:             item.model,
      serialNumber:      item.serialNumber,
      accessories:       item.accessories || '',
      assignedTo:        item.assignedTo || '',
      _employeeId:       item.assignedEmployeeId || null,
      department:        item.department || '',
      _deptId:           null,
      status:            STATUS_OPTIONS.find(o => o.label === item.status)?.value ?? 1,
      inventoryTypeId:   item.inventoryTypeId,
      purchaseDate:      toInputDate(item.purchaseDate),
      purchasePrice:     item.purchasePrice ?? '',
      decommissionDate:  toInputDate(item.decommissionDate),
      decommissionReason: item.decommissionReason || '',
      isPhone:           item.isPhone,
      phoneNumber:       item.phoneDetails?.phoneNumber || '',
      imei:              item.phoneDetails?.imei || '',
      pinPattern:        item.phoneDetails?.pinPattern || '',
    });
    setActiveTab(0);
    setOpenItem(true);
  };

  const handleGenerateNumber = async () => {
    // Usa el ID almacenado al seleccionar, o busca por nombre como fallback
    let deptId = form._deptId;
    if (!deptId) {
      const dept = departments.find(d =>
        d.name.toLowerCase() === form.department?.toLowerCase()
      );
      if (!dept) {
        setError('Selecciona un departamento válido del catálogo para generar el número.');
        return;
      }
      if (!dept.inventoryPrefix) {
        setError(`El departamento "${dept.name}" no tiene prefijo configurado. Configúralo en Catálogos → Departamentos.`);
        return;
      }
      deptId = dept.id;
    }
    setGeneratingNum(true);
    try {
      const r = await inventoryApi.getNextNumber(deptId);
      setForm(prev => ({ ...prev, inventoryNumber: r.data.nextNumber }));
    } catch {
      setError('Error al generar el número de inventario.');
    } finally {
      setGeneratingNum(false);
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const fSwitch = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.checked }));

  const handleSave = async () => {
    if (!form.inventoryNumber || !form.name || !form.brand || !form.model || !form.serialNumber || !form.inventoryTypeId) {
      setError('Completa los campos obligatorios (*).');
      return;
    }
    setSaving(true);
    // eslint-disable-next-line no-unused-vars
    const { _deptId, _employeeId, ...formData } = form;
    const payload = {
      ...formData,
      status:             STATUS_OPTIONS.find(o => o.value === form.status)?.label ?? 'Activo',
      assignedEmployeeId: _employeeId || null,
      purchasePrice:  form.purchasePrice !== '' ? parseFloat(form.purchasePrice) : null,
      purchaseDate:   form.purchaseDate   || null,
      decommissionDate: form.decommissionDate || null,
      decommissionReason: form.decommissionReason || null,
    };
    try {
      if (editing) {
        await inventoryApi.updateItem(editing.id, payload);
      } else {
        await inventoryApi.createItem(payload);
      }
      setOpenItem(false);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este equipo?')) return;
    try {
      await inventoryApi.deleteItem(id);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al eliminar.'));
    }
  };

  // ─── Historial / Transferencias ─────────────────────────────────────────
  const openHistoryDialog = async (item) => {
    setHistoryItem(item);
    setOpenHistory(true);
    setLoadingHist(true);
    try {
      const r = await inventoryApi.getTransfers(item.id);
      setTransfers(r.data);
    } catch {
      setTransfers([]);
    } finally {
      setLoadingHist(false);
    }
  };

  const startTransfer = () => {
    setTransferForm(EMPTY_TRANSFER);
    setOpenTransfer(true);
  };

  const handleTransfer = async () => {
    setSendingTransfer(true);
    try {
      await inventoryApi.createTransfer(historyItem.id, {
        inventoryItemId: historyItem.id,
        ...transferForm,
      });
      setOpenTransfer(false);
      openHistoryDialog(historyItem);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al registrar transferencia.'));
      setOpenTransfer(false);
    } finally {
      setSendingTransfer(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Equipos de Inventario</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} equipo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Exportar a Excel">
            <Button
              variant="outlined" startIcon={<DownloadIcon />}
              href={inventoryApi.exportUrl()} download
              sx={{ borderRadius: 2 }}
            >
              Exportar
            </Button>
          </Tooltip>
          <Tooltip title="Importar desde Excel">
            <Button
              variant="outlined" color="success" startIcon={<UploadIcon />}
              onClick={() => setOpenImport(true)}
              sx={{ borderRadius: 2 }}
            >
              Importar
            </Button>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
            Nuevo equipo
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filtros */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              size="small" fullWidth placeholder="Buscar por nombre, número, serie…"
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <TextField
              select size="small" fullWidth label="Categoría"
              value={filterType} onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <TextField
              select size="small" fullWidth label="Estatus"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.label}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={1} md={2} sx={{ textAlign: 'right' }}>
            <Button size="small" onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }}>
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>No. Inv.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Equipo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Marca / Modelo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>No. Serie</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Asignado a</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Depto.</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Estatus</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay equipos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : filtered.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {item.isPhone && <PhoneAndroidIcon fontSize="small" color="action" />}
                      <Typography variant="body2" fontWeight={600}>{item.inventoryNumber}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.typeName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.brand}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.model}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.serialNumber}</TableCell>
                  <TableCell>{item.assignedEmployeeName || item.assignedTo || <Typography variant="caption" color="text.disabled">Sin asignar</Typography>}</TableCell>
                  <TableCell>{item.department || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip label={statusLabel(item.status)} color={statusColor(item.status)} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Historial / Transferir">
                        <IconButton size="small" color="primary" onClick={() => openHistoryDialog(item)}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Dialog CRUD ─────────────────────────────────────────────────────── */}
      <Dialog open={openItem} onClose={() => setOpenItem(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>
          {editing ? `Editar: ${editing.inventoryNumber}` : 'Nuevo equipo'}
        </DialogTitle>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="General" />
          <Tab label="Costos / Baja" />
          {form.isPhone && <Tab label="Teléfono" />}
        </Tabs>
        <DialogContent>
          {/* Tab General */}
          {activeTab === 0 && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="No. Inventario *"
                  value={form.inventoryNumber}
                  fullWidth size="small"
                  disabled
                  inputProps={{ style: { fontFamily: 'monospace', fontWeight: 600 } }}
                  placeholder="Selecciona un departamento…"
                  helperText="Se genera al seleccionar el departamento"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField label="Nombre del equipo *" value={form.name} onChange={f('name')} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Marca *" value={form.brand} onChange={f('brand')} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Modelo *" value={form.model} onChange={f('model')} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="No. Serie *" value={form.serialNumber} onChange={f('serialNumber')} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Categoría *" value={form.inventoryTypeId} onChange={f('inventoryTypeId')} fullWidth size="small">
                  {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Estatus" value={form.status} onChange={f('status')} fullWidth size="small">
                  {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={employees}
                  getOptionLabel={e => (typeof e === 'string' ? e : e.fullName)}
                  value={form.assignedTo}
                  onChange={(_, val) => {
                    if (val && typeof val === 'object') {
                      setForm(prev => ({ ...prev, assignedTo: val.fullName, _employeeId: val.id }));
                    }
                  }}
                  onInputChange={(_, val, reason) => {
                    if (reason === 'input' || reason === 'clear')
                      setForm(prev => ({ ...prev, assignedTo: val, _employeeId: null }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Persona asignada" size="small" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={departments}
                  getOptionLabel={d => (typeof d === 'string' ? d : d.name)}
                  value={form.department}
                  onChange={async (_, val) => {
                    if (val && typeof val === 'object') {
                      setForm(prev => ({ ...prev, department: val.name, _deptId: val.id }));
                      // Genera el número automáticamente al seleccionar departamento
                      if (val.inventoryPrefix) {
                        setGeneratingNum(true);
                        try {
                          const r = await inventoryApi.getNextNumber(val.id);
                          setForm(prev => ({ ...prev, department: val.name, _deptId: val.id, inventoryNumber: r.data.nextNumber }));
                        } catch {
                          setError('Error al generar el número de inventario.');
                        } finally {
                          setGeneratingNum(false);
                        }
                      }
                    }
                  }}
                  onInputChange={(_, val, reason) => {
                    if (reason === 'input' || reason === 'clear')
                      setForm(prev => ({ ...prev, department: val, _deptId: null, inventoryNumber: '' }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Departamento" size="small" fullWidth
                      InputProps={{ ...params.InputProps, endAdornment: (
                        <>
                          {generatingNum && <CircularProgress size={16} sx={{ mr: 1 }} />}
                          {params.InputProps.endAdornment}
                        </>
                      )}}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Accesorios" value={form.accessories} onChange={f('accessories')} fullWidth size="small" multiline rows={2} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={form.isPhone} onChange={fSwitch('isPhone')} />}
                  label="Es un teléfono / celular"
                />
              </Grid>
            </Grid>
          )}

          {/* Tab Costos / Baja */}
          {activeTab === 1 && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha de compra" type="date" value={form.purchaseDate}
                  onChange={f('purchaseDate')} fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Precio de compra (MXN)" type="number" value={form.purchasePrice}
                  onChange={f('purchasePrice')} fullWidth size="small"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Baja del equipo</Typography></Divider></Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha de baja" type="date" value={form.decommissionDate}
                  onChange={f('decommissionDate')} fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Motivo de baja" value={form.decommissionReason}
                  onChange={f('decommissionReason')} fullWidth size="small" multiline rows={3}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab Teléfono */}
          {activeTab === 2 && form.isPhone && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={4}>
                <TextField label="No. Teléfono" value={form.phoneNumber} onChange={f('phoneNumber')} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="IMEI" value={form.imei} onChange={f('imei')} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Pin / Patrón" value={form.pinPattern} onChange={f('pinPattern')} fullWidth size="small" />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenItem(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Historial / Transferir ──────────────────────────────────── */}
      <Dialog open={openHistory} onClose={() => setOpenHistory(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>Historial: {historyItem?.inventoryNumber}</span>
            <Button variant="outlined" size="small" startIcon={<SwapHorizIcon />} onClick={startTransfer}>
              Transferir
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {loadingHist ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : transfers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Sin transferencias registradas.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {transfers.map((t, i) => (
                <Paper key={t.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {t.fromPerson || 'Sin asignar'} → {t.toPerson || 'Sin asignar'}
                      </Typography>
                      {(t.fromDepartment || t.toDepartment) && (
                        <Typography variant="caption" color="text.secondary">
                          {t.fromDepartment || '—'} → {t.toDepartment || '—'}
                        </Typography>
                      )}
                      {t.notes && <Typography variant="caption" display="block" color="text.disabled">{t.notes}</Typography>}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                      {new Date(t.transferDate).toLocaleDateString('es-MX')}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.disabled">Por: {t.createdBy}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenHistory(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Importar Excel ───────────────────────────────────────────── */}
      <ExcelImportDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        onImported={load}
      />

      {/* ─── Dialog Nueva transferencia ──────────────────────────────────────── */}
      <Dialog open={openTransfer} onClose={() => setOpenTransfer(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Nueva transferencia</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              freeSolo
              options={employees.map(e => e.fullName)}
              value={transferForm.toPerson}
              onInputChange={(_, val) => setTransferForm(f => ({ ...f, toPerson: val }))}
              renderInput={(params) => (
                <TextField {...params} label="Asignar a (persona)" size="small" fullWidth />
              )}
            />
            <Autocomplete
              freeSolo
              options={departments.map(d => d.name)}
              value={transferForm.toDepartment}
              onInputChange={(_, val) => setTransferForm(f => ({ ...f, toDepartment: val }))}
              renderInput={(params) => (
                <TextField {...params} label="Departamento destino" size="small" fullWidth />
              )}
            />
            <TextField
              label="Notas / Observaciones" value={transferForm.notes} fullWidth size="small" multiline rows={2}
              onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenTransfer(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleTransfer} disabled={sendingTransfer}>
            {sendingTransfer ? <CircularProgress size={20} /> : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
