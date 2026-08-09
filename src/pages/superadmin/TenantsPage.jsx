import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Tooltip, Switch, Divider, Avatar, LinearProgress,
  Drawer, List, ListItem, ListItemText,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import EditIcon           from '@mui/icons-material/Edit';
import BusinessIcon       from '@mui/icons-material/Business';
import PeopleIcon         from '@mui/icons-material/People';
import CalendarTodayIcon  from '@mui/icons-material/CalendarToday';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CancelIcon         from '@mui/icons-material/Cancel';
import WarningIcon        from '@mui/icons-material/Warning';
import UploadIcon         from '@mui/icons-material/Upload';
import BarChartIcon       from '@mui/icons-material/BarChart';
import CloseIcon          from '@mui/icons-material/Close';
import { tenantsApi } from '../../api/pandoraApi';

const EMPTY_FORM = {
  slug: '', name: '', displayName: '', primaryColor: '#1A237E', secondaryColor: '#283593',
  licensedModules: -1, maxUsers: 50, expiresAt: '', contactEmail: '', notes: '',
};

export default function TenantsPage() {
  const [tenants,   setTenants]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState('');
  const [msgSev,    setMsgSev]    = useState('success');
  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState(null); // null = nuevo
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [newCreds,  setNewCreds]  = useState(null); // { adminUsername, adminPassword }
  const logoInputRef = useRef();

  // Stats drawer
  const [statsOpen,   setStatsOpen]   = useState(false);
  const [statsTenant, setStatsTenant] = useState(null);
  const [stats,       setStats]       = useState(null);
  const [statsLoading,setStatsLoading]= useState(false);

  const load = () => {
    setLoading(true);
    tenantsApi.getAll()
      .then(r => setTenants(r.data))
      .catch(() => { setMsg('❌ Error al cargar los clientes.'); setMsgSev('error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      slug:           t.slug,
      name:           t.name,
      displayName:    t.displayName,
      primaryColor:   t.primaryColor   ?? '#1A237E',
      secondaryColor: t.secondaryColor ?? '#283593',
      licensedModules: t.licensedModules ?? -1,
      maxUsers:       t.maxUsers ?? 50,
      expiresAt:      t.expiresAt ? t.expiresAt.substring(0, 10) : '',
      contactEmail:   t.contactEmail ?? '',
      notes:          t.notes ?? '',
    });
    setFormErr('');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.slug.trim())        return setFormErr('El slug es requerido.');
    if (!form.name.trim())        return setFormErr('El nombre completo es requerido.');
    if (!form.displayName.trim()) return setFormErr('El nombre corto es requerido.');
    setSaving(true);
    setFormErr('');
    try {
      const payload = {
        ...form,
        slug:           form.slug.trim().toLowerCase(),
        licensedModules: Number(form.licensedModules),
        maxUsers:        Number(form.maxUsers),
        expiresAt:       form.expiresAt || null,
        contactEmail:    form.contactEmail || null,
        notes:           form.notes || null,
      };
      if (editing) {
        await tenantsApi.update(editing.id, payload);
        setMsg('✅ Cliente actualizado.');
      } else {
        const { data } = await tenantsApi.create(payload);
        setMsg('✅ Cliente creado correctamente.');
        if (data.adminUsername) setNewCreds({ adminUsername: data.adminUsername, adminPassword: data.adminPassword });
      }
      setMsgSev('success');
      setOpen(false);
      load();
    } catch (e) {
      setFormErr(e.response?.data || e.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t) => {
    try {
      await tenantsApi.toggle(t.id);
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } catch { setMsg('❌ Error al cambiar estado.'); setMsgSev('error'); }
  };

  const openStats = async (t) => {
    setStatsTenant(t);
    setStatsOpen(true);
    setStats(null);
    setStatsLoading(true);
    try {
      const { data } = await tenantsApi.getStats(t.id);
      setStats(data);
    } catch { setStats({ error: true }); }
    finally { setStatsLoading(false); }
  };

  const handleLogoUpload = async (e, tenantId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await tenantsApi.uploadLogo(tenantId, file);
      setMsg('✅ Logo actualizado.');
      setMsgSev('success');
      load();
    } catch { setMsg('❌ Error al subir el logo.'); setMsgSev('error'); }
    e.target.value = '';
  };

  const daysUntilExpiry = (expiresAt) => {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const expiryChip = (t) => {
    if (!t.expiresAt) return <Chip label="Sin expiración" size="small" color="success" variant="outlined" />;
    const days = daysUntilExpiry(t.expiresAt);
    if (days < 0)  return <Chip label="Vencida" size="small" color="error" icon={<CancelIcon />} />;
    if (days <= 30) return <Chip label={`Vence en ${days}d`} size="small" color="warning" icon={<WarningIcon />} />;
    return <Chip label={new Date(t.expiresAt).toLocaleDateString('es-MX')} size="small" color="default" variant="outlined" icon={<CalendarTodayIcon />} />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <BusinessIcon color="primary" sx={{ fontSize: 34 }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="primary.main">Panel de Clientes</Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de tenants — clientes del sistema Pandora
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nuevo cliente
        </Button>
      </Stack>

      {msg && <Alert severity={msgSev} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Stats rápidas */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {[
          { label: 'Total clientes', value: tenants.length, color: 'primary.main' },
          { label: 'Activos',        value: tenants.filter(t => t.isActive).length,  color: 'success.main' },
          { label: 'Vencidos',       value: tenants.filter(t => t.expiresAt && daysUntilExpiry(t.expiresAt) < 0).length, color: 'error.main' },
          { label: 'Por vencer',     value: tenants.filter(t => { const d = daysUntilExpiry(t.expiresAt); return d !== null && d >= 0 && d <= 30; }).length, color: 'warning.main' },
        ].map(s => (
          <Card key={s.label} sx={{ minWidth: 130, flex: '1 1 130px' }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Tabla de tenants */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Logo', 'Slug', 'Cliente', 'Usuarios', 'Vencimiento', 'Estado', 'Acciones'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenants.map((t, i) => (
                    <TableRow key={t.id} hover sx={{ bgcolor: i % 2 === 0 ? 'white' : 'grey.50' }}>
                      {/* Logo */}
                      <TableCell>
                        {t.hasLogo ? (
                          <Avatar
                            src={`${tenantsApi.getById(t.id).url ?? ''}`}
                            variant="rounded"
                            sx={{ width: 36, height: 36, bgcolor: t.primaryColor }}
                          >
                            {t.displayName[0]}
                          </Avatar>
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: t.primaryColor, fontSize: 16, fontWeight: 700 }}>
                            {t.displayName[0]}
                          </Avatar>
                        )}
                      </TableCell>
                      {/* Slug */}
                      <TableCell>
                        <Chip label={t.slug} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                      </TableCell>
                      {/* Nombre */}
                      <TableCell>
                        <Typography fontWeight={600} fontSize={14}>{t.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.name}</Typography>
                        {t.contactEmail && (
                          <Typography variant="caption" color="text.secondary" display="block">{t.contactEmail}</Typography>
                        )}
                      </TableCell>
                      {/* Usuarios */}
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <PeopleIcon fontSize="small" color="action" />
                          <Typography fontSize={13}>{t.activeUsers} / {t.maxUsers}</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (t.activeUsers / t.maxUsers) * 100)}
                          color={t.activeUsers >= t.maxUsers ? 'error' : 'primary'}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      </TableCell>
                      {/* Vencimiento */}
                      <TableCell>{expiryChip(t)}</TableCell>
                      {/* Estado */}
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Switch
                            checked={t.isActive}
                            onChange={() => handleToggle(t)}
                            color="success" size="small"
                          />
                          <Chip
                            label={t.isActive ? 'Activo' : 'Suspendido'}
                            size="small"
                            color={t.isActive ? 'success' : 'default'}
                            icon={t.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                          />
                        </Stack>
                      </TableCell>
                      {/* Acciones */}
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Métricas de uso">
                            <IconButton size="small" onClick={() => openStats(t)}><BarChartIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Subir logo">
                            <IconButton size="small" component="label">
                              <UploadIcon fontSize="small" />
                              <input type="file" accept="image/*" hidden onChange={e => handleLogoUpload(e, t.id)} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No hay clientes registrados. Crea el primero con el botón "Nuevo cliente".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Drawer de métricas ───────────────────────────────────────────── */}
      <Drawer anchor="right" open={statsOpen} onClose={() => setStatsOpen(false)}>
        <Box sx={{ width: 340, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>{statsTenant?.displayName}</Typography>
            <IconButton size="small" onClick={() => setStatsOpen(false)}><CloseIcon /></IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {statsLoading && <Box textAlign="center" py={4}><CircularProgress /></Box>}
          {stats?.error && <Alert severity="error">No se pudieron cargar las métricas.</Alert>}
          {stats && !stats.error && (
            <Stack spacing={2}>
              {[
                { label: 'Usuarios activos',            value: `${stats.activeUsers} / ${statsTenant?.maxUsers}`, color: stats.activeUsers >= statsTenant?.maxUsers ? 'error.main' : 'primary.main' },
                { label: 'Usuarios totales',            value: stats.totalUsers, color: 'text.primary' },
                { label: 'Tickets (últimos 30 días)',   value: stats.ticketsLast30, color: 'text.primary' },
                { label: 'Mantenimientos (30 días)',    value: stats.mantLast30, color: 'text.primary' },
                { label: 'Registros checador (7 días)', value: stats.checkLast7, color: 'text.primary' },
              ].map(s => (
                <Card key={s.label} variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </CardContent>
                </Card>
              ))}

              {/* Barra de uso de licencia */}
              <Box>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  Uso de usuarios: {stats.activeUsers}/{statsTenant?.maxUsers}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (stats.activeUsers / (statsTenant?.maxUsers || 1)) * 100)}
                  color={stats.activeUsers >= statsTenant?.maxUsers ? 'error' : 'primary'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>

              {statsTenant?.expiresAt && (
                <Alert severity={daysUntilExpiry(statsTenant.expiresAt) <= 5 ? 'error' : daysUntilExpiry(statsTenant.expiresAt) <= 30 ? 'warning' : 'success'}>
                  Licencia: {daysUntilExpiry(statsTenant.expiresAt) > 0
                    ? `vence en ${daysUntilExpiry(statsTenant.expiresAt)} días`
                    : 'VENCIDA'}
                </Alert>
              )}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* ── Diálogo credenciales del nuevo tenant ─────────────────────────── */}
      <Dialog open={!!newCreds} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>🎉 Tenant creado — Credenciales de acceso</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Guarde estas credenciales. La contraseña no se mostrará de nuevo.
          </Alert>
          <Stack spacing={1.5}>
            <TextField label="Usuario admin" value={newCreds?.adminUsername ?? ''} InputProps={{ readOnly: true }} fullWidth size="small" />
            <TextField label="Contraseña temporal" value={newCreds?.adminPassword ?? ''} InputProps={{ readOnly: true }} fullWidth size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            Si hay un correo de contacto configurado, el cliente ya recibió estos datos por email.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNewCreds(null)}>Entendido</Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo crear/editar tenant ───────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editing ? `Editar cliente — ${editing.displayName}` : 'Nuevo cliente'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {!editing && (
              <TextField
                label="Slug (identificador único)" fullWidth required
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="ej: acme, contoso, empresa-sa"
                helperText="Solo minúsculas, números y guiones. No se puede cambiar después."
              />
            )}
            <TextField
              label="Nombre completo del cliente" fullWidth required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ej: Acme Corporación S.A. de C.V."
            />
            <TextField
              label="Nombre corto (mostrado en la UI)" fullWidth required
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="ej: Acme"
            />
            <Stack direction="row" spacing={2}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Color primario</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <input type="color" value={form.primaryColor}
                    onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    style={{ width: 40, height: 40, cursor: 'pointer', border: 'none', borderRadius: 4 }} />
                  <TextField size="small" value={form.primaryColor}
                    onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    sx={{ width: 110 }} />
                </Stack>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Color secundario</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <input type="color" value={form.secondaryColor}
                    onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
                    style={{ width: 40, height: 40, cursor: 'pointer', border: 'none', borderRadius: 4 }} />
                  <TextField size="small" value={form.secondaryColor}
                    onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
                    sx={{ width: 110 }} />
                </Stack>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Máx. usuarios" type="number" sx={{ flex: 1 }}
                value={form.maxUsers}
                onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))}
              />
              <TextField
                label="Fecha de expiración (opcional)" type="date" sx={{ flex: 1 }}
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label="Correo de contacto (opcional)" type="email" fullWidth
              value={form.contactEmail}
              onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
            />
            <TextField
              label="Notas internas (opcional)" fullWidth multiline rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ej: Contrato firmado 2026-01-15, renovación anual..."
            />

            {/* Preview del branding */}
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: form.primaryColor,
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}>
                {(form.displayName || '?')[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography fontWeight={800} color="white" letterSpacing={1}>
                  {form.displayName || 'Vista previa'}
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.7)">Sistema de Gestión</Typography>
              </Box>
            </Box>

            {formErr && <Alert severity="error">{formErr}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editing ? 'Guardar cambios' : 'Crear cliente')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
