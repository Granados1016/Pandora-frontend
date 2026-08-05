import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Stack, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  ToggleButton, ToggleButtonGroup, CircularProgress, Tooltip, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormGroup, FormControlLabel, Checkbox, Divider, Radio, RadioGroup,
  ToggleButtonGroup as MuiTBG, InputAdornment,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import BackupIcon from '@mui/icons-material/Backup';
import SaveIcon from '@mui/icons-material/Save';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import BadgeIcon from '@mui/icons-material/Badge';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SecurityIcon from '@mui/icons-material/Security';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { userApi, adminApi, ticketApi, authApi, calendarApi } from '../api/pandoraApi';
import { MODULE_LABELS, MODULES, SUB_MODULES, useAuth } from '../hooks/useAuth.jsx';

const ALL_MODULES = Object.entries(MODULE_LABELS).map(([value, label]) => ({
  value: parseInt(value),
  label,
}));

// Módulos que ofrecen tres niveles de acceso: Sin acceso / Solo vista / Escritura completa
// (excluir ADMIN que siempre tiene acceso total)
const MODULES_WITH_WRITE = new Set([
  MODULES.MAIL_PLUS, MODULES.INVENTARIO, MODULES.LICENCIAS,
  MODULES.HELPDESK,
  MODULES.CALENDARIO, MODULES.CALENDARIO_ADMIN,
  MODULES.CAL_ROOMS, MODULES.CAL_REQUEST, MODULES.CAL_SOLICITUDES, MODULES.CAL_REPORTS_CAL,
  MODULES.PROCEDIMIENTOS, MODULES.INDICADORES, MODULES.COMUNICADOS,
  MODULES.REPORTS,
]);

const ALL_MODULES_VALUE = Object.entries(MODULE_LABELS)
  .filter(([v]) => parseInt(v) !== MODULES.ADMIN)
  .reduce((acc, [v]) => acc | parseInt(v), 0);

const EMPTY_FORM = {
  username: '', fullName: '', email: '', position: '',
  password: '', role: 'User', modules: 0, modulesViewOnly: 0, isActive: true,
};

// Obtener el estado de acceso de un módulo: 'none' | 'view' | 'write'
function getModuleAccess(mod, modules, modulesViewOnly) {
  if ((modules & mod) === 0) return 'none';
  if ((modulesViewOnly & mod) !== 0) return 'view';
  return 'write';
}

// Aplicar cambio de estado a los bitmasks
function applyModuleAccess(mod, access, modules, modulesViewOnly) {
  let newModules = modules;
  let newViewOnly = modulesViewOnly;
  if (access === 'none') {
    newModules  = modules & ~mod;
    newViewOnly = modulesViewOnly & ~mod;
  } else if (access === 'view') {
    newModules  = modules | mod;
    newViewOnly = modulesViewOnly | mod;
  } else {
    newModules  = modules | mod;
    newViewOnly = modulesViewOnly & ~mod;
  }
  return { modules: newModules, modulesViewOnly: newViewOnly };
}

// Secciones colapsables del panel — su estado (abierta/cerrada) se recuerda por navegador
const ACCORDION_SECTIONS = ['backup', 'smtp', 'puestos', 'calNotif', 'usuarios'];
const ACCORDION_STORAGE_KEY = 'pandora_admin_accordion_state';

function loadAccordionState() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCORDION_STORAGE_KEY) || '{}');
    return ACCORDION_SECTIONS.reduce((acc, key) => {
      acc[key] = saved[key] ?? true;
      return acc;
    }, {});
  } catch {
    return ACCORDION_SECTIONS.reduce((acc, key) => { acc[key] = true; return acc; }, {});
  }
}

export default function Admin() {
  const { username: currentUser } = useAuth();
  const [expandedSections, setExpandedSections] = useState(loadAccordionState);

  const toggleSection = (key) => {
    setExpandedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // ── Backup ────────────────────────────────────────────────────────────────
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg,     setBackupMsg]     = useState('');

  // ── SMTP Config ───────────────────────────────────────────────────────────
  const EMPTY_SMTP = { host: '', port: 587, fromEmail: '', password: '', fromName: 'Pandora', useSsl: true };
  const [smtp,            setSmtp]            = useState(EMPTY_SMTP);
  const [smtpLoading,     setSmtpLoading]     = useState(false);
  const [smtpSaving,      setSmtpSaving]      = useState(false);
  const [smtpMsg,         setSmtpMsg]         = useState('');
  const [smtpMsgSev,      setSmtpMsgSev]      = useState('success');
  const [showSmtpPass,    setShowSmtpPass]    = useState(false);
  const [smtpTesting,     setSmtpTesting]     = useState(false);
  const [testEmail,       setTestEmail]       = useState('');
  const [testDialog,      setTestDialog]      = useState(false);
  const [hasDbPassword,   setHasDbPassword]   = useState(false);

  // ── CSV Import ────────────────────────────────────────────────────────────
  const [csvOpen,     setCsvOpen]     = useState(false);
  const [csvRows,     setCsvRows]     = useState([]);
  const [csvError,    setCsvError]    = useState('');
  const [csvResult,   setCsvResult]   = useState(null);
  const [csvImporting,setCsvImporting]= useState(false);
  const csvFileRef = React.useRef();

  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setCsvError('El archivo debe tener encabezado y al menos una fila.'); return; }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
          const row = {};
          headers.forEach((h, i) => { row[h] = vals[i] || ''; });
          return {
            username:  row.username || row.user || '',
            fullName:  row.fullname || row['nombre completo'] || row.nombre || '',
            email:     row.email || row.correo || '',
            position:  row.position || row.puesto || '',
            password:  row.password || row.contraseña || 'Pandora123!',
            role:      row.role || row.rol || 'User',
            modules:   parseInt(row.modules || row.modulos || '0') || 0,
          };
        }).filter(r => r.username);
        setCsvRows(rows);
        setCsvError('');
        setCsvResult(null);
      } catch { setCsvError('Error al parsear el archivo CSV.'); }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    setCsvImporting(true);
    try {
      const res = await userApi.importCsv(csvRows);
      setCsvResult(res.data);
      const { data: u } = await userApi.getAll();
      setUsers(u);
    } catch (e) { setCsvError(e.response?.data || e.message); }
    finally { setCsvImporting(false); }
  };

  // ── 2FA Toggle ────────────────────────────────────────────────────────────
  const handle2FA = async (username, currentState) => {
    try {
      await authApi.toggle2FA(username, !currentState);
      const { data: u } = await userApi.getAll();
      setUsers(u);
    } catch (e) { setError(e.response?.data || e.message); }
  };

  const loadSmtp = async () => {
    setSmtpLoading(true);
    try {
      const { data } = await adminApi.getSmtpSettings();
      setSmtp({
        host:      data.host      ?? '',
        port:      data.port      ?? 587,
        fromEmail: data.fromEmail ?? '',
        password:  '',               // never returned from server
        fromName:  data.fromName  ?? 'Pandora',
        useSsl:    data.useSsl    ?? true,
      });
      setHasDbPassword(!!data.hasPassword);
    } catch {
      setSmtpMsg('❌ Error al cargar la configuración SMTP.');
      setSmtpMsgSev('error');
    } finally {
      setSmtpLoading(false);
    }
  };

  React.useEffect(() => { loadSmtp(); }, []);

  const handleSmtpSave = async () => {
    if (!smtp.host || !smtp.fromEmail) {
      setSmtpMsg('El servidor y el correo remitente son obligatorios.');
      setSmtpMsgSev('warning');
      return;
    }
    setSmtpSaving(true);
    setSmtpMsg('');
    try {
      await adminApi.saveSmtpSettings(smtp);
      setSmtpMsg('✅ Configuración SMTP guardada correctamente.');
      setSmtpMsgSev('success');
      setHasDbPassword(true);
      setSmtp(s => ({ ...s, password: '' }));
    } catch (e) {
      setSmtpMsg(`❌ ${e.response?.data || e.message || 'Error al guardar.'}`);
      setSmtpMsgSev('error');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSmtpTest = async () => {
    if (!testEmail) return;
    setSmtpTesting(true);
    setSmtpMsg('');
    try {
      const { data } = await adminApi.testSmtp({ toEmail: testEmail });
      setSmtpMsg(data?.message ? `✅ ${data.message}` : '✅ Correo de prueba enviado correctamente.');
      setSmtpMsgSev('success');
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data || e.message || 'Error al enviar el correo de prueba.';
      setSmtpMsg(`❌ ${msg}`);
      setSmtpMsgSev('error');
    } finally {
      setSmtpTesting(false);
      setTestDialog(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMsg('');
    try {
      await adminApi.downloadBackup();
      setBackupMsg('✅ Backup descargado correctamente.');
    } catch (e) {
      setBackupMsg(`❌ Error: ${e.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // ── Catálogo de Puestos — HelpDesk ───────────────────────────────────────
  const [areaConfigs,        setAreaConfigs]        = useState([]);
  const [areaConfigsLoading, setAreaConfigsLoading] = useState(false);
  const [areaConfigsSaving,  setAreaConfigsSaving]  = useState(false);
  const [areaConfigsMsg,     setAreaConfigsMsg]     = useState('');

  // Diálogo "Nuevo Puesto"
  const [posDialog,     setPosDialog]     = useState(false);
  const [posName,       setPosName]       = useState('');
  const [posSaving,     setPosSaving]     = useState(false);
  const [posError,      setPosError]      = useState('');

  const loadAreaConfigs = () => {
    setAreaConfigsLoading(true);
    ticketApi.getAreaConfigs()
      .then(r => setAreaConfigs(r.data))
      .catch(() => setAreaConfigsMsg('❌ Error al cargar los puestos.'))
      .finally(() => setAreaConfigsLoading(false));
  };

  React.useEffect(() => { loadAreaConfigs(); }, []);

  const saveAreaConfigs = async () => {
    setAreaConfigsSaving(true);
    setAreaConfigsMsg('');
    try {
      await ticketApi.updateAreaConfigs(areaConfigs);
      setAreaConfigsMsg('✅ Correos guardados correctamente.');
    } catch {
      setAreaConfigsMsg('❌ Error al guardar.');
    } finally {
      setAreaConfigsSaving(false);
    }
  };

  const handleAddPosition = async () => {
    if (!posName.trim()) { setPosError('El nombre del puesto es requerido.'); return; }
    setPosSaving(true);
    setPosError('');
    try {
      const { data } = await ticketApi.createPosition(posName.trim());
      setAreaConfigs(prev => [...prev, data]);
      setPosDialog(false);
      setPosName('');
      setAreaConfigsMsg('✅ Puesto creado correctamente.');
    } catch (e) {
      setPosError(e.response?.data || e.message || 'Error al crear el puesto.');
    } finally {
      setPosSaving(false);
    }
  };

  const handleDeletePosition = async (cfg) => {
    if (!confirm(`¿Eliminar el puesto "${cfg.area}"?\nSolo se puede eliminar si no tiene tickets asociados.`)) return;
    try {
      await ticketApi.deletePosition(cfg.id);
      setAreaConfigs(prev => prev.filter(c => c.id !== cfg.id));
      setAreaConfigsMsg('✅ Puesto eliminado.');
    } catch (e) {
      const msg = e.response?.status === 409
        ? 'No se puede eliminar: existen tickets asociados a este puesto.'
        : (e.response?.data || 'Error al eliminar el puesto.');
      setAreaConfigsMsg(`❌ ${msg}`);
    }
  };

  // ── Correos de notificación — Reservas de sala ───────────────────────────
  const [calNotifEmails,    setCalNotifEmails]    = useState([]);
  const [calNotifLoading,   setCalNotifLoading]   = useState(false);
  const [calNotifMsg,       setCalNotifMsg]        = useState('');
  const [calNotifMsgSev,    setCalNotifMsgSev]     = useState('success');
  const [newCalEmail,       setNewCalEmail]        = useState('');
  const [newCalDesc,        setNewCalDesc]         = useState('');
  const [calEmailSaving,    setCalEmailSaving]     = useState(false);

  const loadCalNotifEmails = () => {
    setCalNotifLoading(true);
    calendarApi.getNotifEmails()
      .then(r => setCalNotifEmails(r.data))
      .catch(() => { setCalNotifMsg('❌ Error al cargar correos.'); setCalNotifMsgSev('error'); })
      .finally(() => setCalNotifLoading(false));
  };

  React.useEffect(() => { loadCalNotifEmails(); }, []);

  const handleAddCalEmail = async () => {
    if (!newCalEmail.trim()) return;
    setCalEmailSaving(true);
    setCalNotifMsg('');
    try {
      const { data } = await calendarApi.addNotifEmail({ email: newCalEmail.trim(), descripcion: newCalDesc.trim() || null });
      setCalNotifEmails(prev => [...prev, { id: data.id, email: newCalEmail.trim(), descripcion: newCalDesc.trim() || null, activo: true }]);
      setNewCalEmail('');
      setNewCalDesc('');
      setCalNotifMsg('✅ Correo agregado correctamente.');
      setCalNotifMsgSev('success');
    } catch (e) {
      setCalNotifMsg(`❌ ${e.response?.data || 'Error al agregar el correo.'}`);
      setCalNotifMsgSev('error');
    } finally {
      setCalEmailSaving(false);
    }
  };

  const handleToggleCalEmail = async (id) => {
    try {
      await calendarApi.toggleNotifEmail(id);
      setCalNotifEmails(prev => prev.map(e => e.id === id ? { ...e, activo: !e.activo } : e));
    } catch { setCalNotifMsg('❌ Error al cambiar estado.'); setCalNotifMsgSev('error'); }
  };

  const handleDeleteCalEmail = async (id, email) => {
    if (!confirm(`¿Eliminar el correo "${email}" de las notificaciones?`)) return;
    try {
      await calendarApi.deleteNotifEmail(id);
      setCalNotifEmails(prev => prev.filter(e => e.id !== id));
      setCalNotifMsg('✅ Correo eliminado.');
      setCalNotifMsgSev('success');
    } catch { setCalNotifMsg('❌ Error al eliminar.'); setCalNotifMsgSev('error'); }
  };

  const load = () =>
    userApi.getAll()
      .then(r => setUsers(r.data))
      .catch(() => setError('Error al cargar usuarios.'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSaveError('');
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      position: u.position || '',
      password: '',
      role: u.role,
      modules: u.modules,
      modulesViewOnly: u.modulesViewOnly ?? 0,
      isActive: u.isActive,
    });
    setSaveError('');
    setOpen(true);
  };

  const toggleModule = (mod) => {
    setForm(f => ({ ...f, modules: f.modules ^ mod }));
  };

  const setModuleAccess = (mod, access) => {
    setForm(f => {
      const result = applyModuleAccess(mod, access, f.modules, f.modulesViewOnly);
      return { ...f, ...result };
    });
  };

  const handleSave = async () => {
    if (!editing && !form.password.trim()) {
      setSaveError('La contraseña es requerida para nuevos usuarios.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      if (editing) {
        await userApi.update(editing.id, {
          fullName: form.fullName,
          email: form.email,
          password: form.password || undefined,
          role: form.role,
          position: form.position || null,
          modules: form.modules,
          modulesViewOnly: form.modulesViewOnly,
          isActive: form.isActive,
        });
      } else {
        await userApi.create({
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          position: form.position || null,
          modules: form.modules,
          modulesViewOnly: form.modulesViewOnly,
          isActive: form.isActive,
        });
      }
      setOpen(false);
      load();
    } catch (err) {
      setSaveError(err.response?.data || err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (u.username === currentUser) {
      setError('No puedes eliminar tu propio usuario.');
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${u.fullName}"?`)) return;
    try {
      await userApi.remove(u.id);
      load();
    } catch {
      setError('Error al eliminar el usuario.');
    }
  };

  const moduleChips = (user) =>
    ALL_MODULES.filter(m => user.modules & m.value).map(m => {
      const isViewOnly = (user.modulesViewOnly ?? 0) & m.value;
      return (
        <Chip
          key={m.value}
          label={isViewOnly ? `${m.label} (vista)` : m.label}
          size="small"
          variant="outlined"
          color={m.value === MODULES.ADMIN ? 'error' : isViewOnly ? 'default' : 'primary'}
          icon={isViewOnly ? <VisibilityIcon sx={{ fontSize: '14px !important' }} /> : undefined}
          sx={{ mr: 0.5, mb: 0.5 }}
        />
      );
    });

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3, md: 4 }, maxWidth: '100%', overflowX: 'hidden' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AdminPanelSettingsIcon color="primary" sx={{ fontSize: { xs: 26, sm: 32 } }} />
          <Typography variant="h4" fontWeight={800} color="primary.main"
            sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Administración
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => { setCsvRows([]); setCsvResult(null); setCsvError(''); setCsvOpen(true); }}>
            Importar CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Nuevo Usuario</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Backup de base de datos ──────────────────────────────────────── */}
      <Accordion
        expanded={expandedSections.backup}
        onChange={() => toggleSection('backup')}
        sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <BackupIcon color="primary" sx={{ fontSize: 26 }} />
            <Typography variant="h6" fontWeight={700}>Backup de Base de Datos</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Descarga una copia de seguridad completa de la base de datos en formato <strong>.bak</strong> (SQL Server) o <strong>.sql</strong> (LocalDB).
          </Typography>
          {backupMsg && (
            <Alert severity={backupMsg.startsWith('✅') ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setBackupMsg('')}>
              {backupMsg}
            </Alert>
          )}
          <Button
            variant="contained" startIcon={backupLoading ? <CircularProgress size={18} color="inherit" /> : <BackupIcon />}
            onClick={handleBackup} disabled={backupLoading}
            sx={{ borderRadius: 2 }}
          >
            {backupLoading ? 'Generando backup...' : 'Descargar Backup'}
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* ── Configuración SMTP ──────────────────────────────────────────── */}
      <Accordion
        expanded={expandedSections.smtp}
        onChange={() => toggleSection('smtp')}
        sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <EmailIcon color="primary" sx={{ fontSize: 26 }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Configuración de Correo (SMTP)</Typography>
              <Typography variant="body2" color="text.secondary">
                Credenciales para el envío de notificaciones por correo electrónico. La contraseña se cifra antes de guardarse.
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 3 } }}>
          {smtpMsg && (
            <Alert severity={smtpMsgSev} sx={{ mb: 2, mt: 1.5 }} onClose={() => setSmtpMsg('')}>
              {smtpMsg}
            </Alert>
          )}

          {smtpLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2} mt={2}>
              {/* Row 1: Host + Port */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Servidor SMTP (Host)" fullWidth required
                  value={smtp.host}
                  onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" color="action" /></InputAdornment> }}
                />
                <TextField
                  label="Puerto" type="number" sx={{ minWidth: 110 }}
                  value={smtp.port}
                  onChange={e => setSmtp(s => ({ ...s, port: parseInt(e.target.value) || 587 }))}
                  inputProps={{ min: 1, max: 65535 }}
                />
              </Stack>

              {/* Row 2: From Email + From Name */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Correo remitente (From Email)" fullWidth required type="email"
                  value={smtp.fromEmail}
                  onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))}
                  placeholder="notificaciones@miempresa.com"
                />
                <TextField
                  label="Nombre remitente (From Name)" fullWidth
                  value={smtp.fromName}
                  onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))}
                  placeholder="Pandora"
                />
              </Stack>

              {/* Row 3: Password + SSL */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  label={hasDbPassword ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña de aplicación'}
                  fullWidth
                  type={showSmtpPass ? 'text' : 'password'}
                  value={smtp.password}
                  onChange={e => setSmtp(s => ({ ...s, password: e.target.value }))}
                  placeholder={hasDbPassword ? '••••••••' : 'App password de Gmail / contraseña SMTP'}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowSmtpPass(v => !v)} edge="end" tabIndex={-1}>
                          {showSmtpPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText={hasDbPassword ? '✅ Contraseña almacenada en la base de datos (cifrada).' : 'Se cifrará con AES-256 antes de guardarse.'}
                />
                <Box sx={{ pt: { xs: 0, sm: 1 }, minWidth: 160 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={smtp.useSsl}
                        onChange={e => setSmtp(s => ({ ...s, useSsl: e.target.checked }))}
                        color="primary"
                      />
                    }
                    label={<Box><Typography variant="body2" fontWeight={600}>Usar SSL/TLS</Typography><Typography variant="caption" color="text.secondary">StartTLS (recomendado)</Typography></Box>}
                  />
                </Box>
              </Stack>

              {/* Actions */}
              <Stack direction="row" spacing={2} flexWrap="wrap" pt={0.5}>
                <Button
                  variant="contained"
                  startIcon={smtpSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSmtpSave}
                  disabled={smtpSaving}
                  sx={{ borderRadius: 2 }}
                >
                  {smtpSaving ? 'Guardando...' : 'Guardar configuración'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SendIcon />}
                  onClick={() => { setTestEmail(''); setTestDialog(true); }}
                  disabled={smtpSaving || (!smtp.host && !hasDbPassword)}
                  sx={{ borderRadius: 2 }}
                >
                  Probar conexión
                </Button>
              </Stack>
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Diálogo probar SMTP */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SendIcon color="primary" />
            <span>Enviar correo de prueba</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={0.5}>
            <Typography variant="body2" color="text.secondary">
              Se enviará un correo de prueba usando la configuración guardada actualmente para verificar la conexión SMTP.
            </Typography>
            <TextField
              label="Correo destinatario" fullWidth type="email" autoFocus
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="tu@correo.com"
              onKeyDown={e => { if (e.key === 'Enter' && testEmail) handleSmtpTest(); }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTestDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={smtpTesting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            onClick={handleSmtpTest}
            disabled={smtpTesting || !testEmail}
          >
            {smtpTesting ? 'Enviando...' : 'Enviar prueba'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Catálogo de Puestos — HelpDesk ──────────────────────────────── */}
      <Accordion
        expanded={expandedSections.puestos}
        onChange={() => toggleSection('puestos')}
        sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <BadgeIcon color="primary" sx={{ fontSize: 26 }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Catálogo de Puestos — HelpDesk</Typography>
              <Typography variant="body2" color="text.secondary">
                Define los puestos disponibles en el formulario de tickets y configura el correo de notificación de cada uno.
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" justifyContent="flex-end" mb={1.5}>
            <Button
              variant="contained" startIcon={<AddIcon />}
              onClick={() => { setPosDialog(true); setPosName(''); setPosError(''); }}
              sx={{ borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Nuevo Puesto
            </Button>
          </Stack>

          {areaConfigsMsg && (
            <Alert severity={areaConfigsMsg.startsWith('✅') ? 'success' : 'error'}
              sx={{ mb: 2 }} onClose={() => setAreaConfigsMsg('')}>
              {areaConfigsMsg}
            </Alert>
          )}

          {areaConfigsLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.50' }}>
                      <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Puesto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Correo de notificación</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 60 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {areaConfigs.map((cfg, idx) => (
                      <TableRow key={cfg.id ?? idx} hover>
                        <TableCell sx={{ color: 'text.disabled', fontSize: 12 }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{cfg.area}</Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" fullWidth type="email"
                            placeholder={`notificaciones@imet.edu.mx`}
                            value={cfg.notificationEmail ?? ''}
                            onChange={e => setAreaConfigs(prev =>
                              prev.map((c, i) => i === idx ? { ...c, notificationEmail: e.target.value } : c)
                            )}
                            sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Eliminar puesto">
                            <IconButton size="small" color="error" onClick={() => handleDeletePosition(cfg)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {areaConfigs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No hay puestos registrados. Agrega el primero.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" rowGap={1}>
                <Button
                  variant="contained"
                  startIcon={areaConfigsSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={saveAreaConfigs} disabled={areaConfigsSaving || areaConfigs.length === 0}
                  sx={{ borderRadius: 2 }}
                >
                  {areaConfigsSaving ? 'Guardando...' : 'Guardar correos'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  <MarkEmailReadIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Al crear un ticket se enviará notificación al correo del puesto seleccionado.
                </Typography>
              </Stack>
            </>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Diálogo nuevo puesto */}
      <Dialog open={posDialog} onClose={() => setPosDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Nuevo Puesto</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label="Nombre del puesto" fullWidth autoFocus
              value={posName}
              onChange={e => { setPosName(e.target.value); setPosError(''); }}
              placeholder="Ej: Coordinación de Recursos Humanos"
              inputProps={{ maxLength: 100 }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPosition(); }}
            />
            {posError && <Alert severity="error">{posError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPosDialog(false)}>Cancelar</Button>
          <Button
            variant="contained" onClick={handleAddPosition}
            disabled={posSaving || !posName.trim()}
          >
            {posSaving ? <CircularProgress size={18} /> : 'Crear Puesto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Correos de notificación — Reservas de sala ───────────────────── */}
      <Accordion
        expanded={expandedSections.calNotif}
        onChange={() => toggleSection('calNotif')}
        sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CalendarMonthIcon color="primary" sx={{ fontSize: 26 }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Notificaciones de reservas de sala</Typography>
              <Typography variant="body2" color="text.secondary">
                Estos correos recibirán una copia de cada reserva o actualización de sala, además del organizador.
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 3 } }}>
          {calNotifMsg && (
            <Alert severity={calNotifMsgSev} sx={{ mb: 2 }} onClose={() => setCalNotifMsg('')}>{calNotifMsg}</Alert>
          )}

          {calNotifLoading ? (
            <Box textAlign="center" py={3}><CircularProgress /></Box>
          ) : (
            <>
              {/* Tabla de correos actuales */}
              {calNotifEmails.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Correo electrónico</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Descripción / Para qué es</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Activo</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Eliminar</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calNotifEmails.map((item, i) => (
                        <TableRow key={item.id} sx={{ bgcolor: i % 2 === 0 ? 'white' : 'grey.50' }}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{item.email}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{item.descripcion || '—'}</TableCell>
                          <TableCell align="center">
                            <Switch
                              checked={item.activo}
                              onChange={() => handleToggleCalEmail(item.id)}
                              color="success" size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleDeleteCalEmail(item.id, item.email)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Formulario agregar nuevo correo */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
                <TextField
                  label="Correo electrónico" type="email" size="small"
                  value={newCalEmail}
                  onChange={e => setNewCalEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  sx={{ minWidth: { xs: '100%', sm: 240 } }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCalEmail(); }}
                />
                <TextField
                  label="Descripción (para qué es)" size="small"
                  value={newCalDesc}
                  onChange={e => setNewCalDesc(e.target.value)}
                  placeholder="Ej: Asistente de Administración"
                  sx={{ minWidth: { xs: '100%', sm: 240 }, flexGrow: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCalEmail(); }}
                />
                <Button
                  variant="contained" startIcon={calEmailSaving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                  onClick={handleAddCalEmail}
                  disabled={calEmailSaving || !newCalEmail.trim()}
                  sx={{ height: 40, borderRadius: 2, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' } }}
                >
                  {calEmailSaving ? 'Agregando...' : 'Agregar correo'}
                </Button>
              </Stack>
            </>
          )}
        </AccordionDetails>
      </Accordion>

      {/* ── Usuarios ──────────────────────────────────────────────────────── */}
      <Accordion
        expanded={expandedSections.usuarios}
        onChange={() => toggleSection('usuarios')}
        sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <PersonIcon color="primary" sx={{ fontSize: 26 }} />
            <Typography variant="h6" fontWeight={700}>Gestión de Usuarios</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Usuario', 'Nombre Completo', 'Puesto', 'Correo', 'Rol', 'Módulos', 'Activo', ''].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.username}</TableCell>
                      <TableCell>{u.fullName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{u.position || '—'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          icon={u.role === 'Admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                          label={u.role === 'Admin' ? 'Administrador' : 'Usuario'}
                          color={u.role === 'Admin' ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        {u.role === 'Admin'
                          ? <Chip label="Acceso total" size="small" color="error" variant="outlined" />
                          : <Box>{moduleChips(u)}</Box>
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.isActive ? 'Activo' : 'Inactivo'}
                          color={u.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.twoFactorEnabled ? 'Deshabilitar 2FA' : 'Habilitar 2FA'}>
                          <IconButton size="small" color={u.twoFactorEnabled ? 'success' : 'default'}
                            onClick={() => handle2FA(u.username, u.twoFactorEnabled)}>
                            <SecurityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.username === currentUser ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}>
                          <span>
                            <IconButton
                              size="small" color="error"
                              onClick={() => handleDelete(u)}
                              disabled={u.username === currentUser}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay usuarios registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Diálogo crear/editar */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editing ? `Editar: ${editing.fullName}` : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5} mt={0.5}>
            <TextField
              label="Usuario (login)" fullWidth value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              disabled={!!editing}
              helperText={editing ? 'El usuario no se puede cambiar' : 'Solo minúsculas, sin espacios'}
            />
            <TextField
              label="Nombre completo" fullWidth value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            />
            <TextField
              label="Puesto / Cargo" fullWidth value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              placeholder="Ej: Coordinador de TI, Docente, Director…"
            />
            <TextField
              label="Correo electrónico" fullWidth value={form.email} type="email"
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <TextField
              label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              fullWidth value={form.password}
              type={showAdminPassword ? 'text' : 'password'}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowAdminPassword(v => !v)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showAdminPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Rol</Typography>
              <ToggleButtonGroup
                value={form.role} exclusive
                onChange={(_, v) => v && setForm(f => ({ ...f, role: v }))}
                fullWidth
              >
                <ToggleButton value="User">Usuario</ToggleButton>
                <ToggleButton value="Admin" sx={{ color: form.role === 'Admin' ? 'error.main' : undefined }}>
                  Administrador
                </ToggleButton>
              </ToggleButtonGroup>
              {form.role === 'Admin' && (
                <Alert severity="warning" sx={{ mt: 1 }} icon={false}>
                  El Administrador tiene acceso a todos los módulos automáticamente.
                </Alert>
              )}
            </Box>

            {form.role === 'User' && (
              <Box>
                <Divider sx={{ mb: 1.5 }} />
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={600}>Acceso por Módulo</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" color="inherit"
                      onClick={() => setForm(f => ({ ...f, modules: 0, modulesViewOnly: 0 }))}>
                      Ninguno
                    </Button>
                    <Button size="small" variant="outlined" color="primary"
                      onClick={() => setForm(f => ({ ...f, modules: ALL_MODULES_VALUE, modulesViewOnly: ALL_MODULES_VALUE & ~MODULES.ADMIN }))}>
                      Solo vista
                    </Button>
                    <Button size="small" variant="contained" color="primary"
                      onClick={() => setForm(f => ({ ...f, modules: ALL_MODULES_VALUE, modulesViewOnly: 0 }))}>
                      Escritura
                    </Button>
                  </Stack>
                </Stack>

                {/* Leyenda */}
                <Stack direction="row" spacing={2} mb={1.5}
                  sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <BlockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">Sin acceso</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <VisibilityIcon sx={{ fontSize: 14, color: 'info.main' }} />
                    <Typography variant="caption" color="info.main">Solo vista</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <EditNoteIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main">Escritura completa</Typography>
                  </Stack>
                </Stack>

                {/* Tabla de módulos */}
                <Stack spacing={0.5}>
                  {ALL_MODULES.filter(m => m.value !== MODULES.ADMIN).map(m => {
                    const access = getModuleAccess(m.value, form.modules, form.modulesViewOnly);
                    const canBeViewOnly = MODULES_WITH_WRITE.has(m.value);
                    const subs = SUB_MODULES.filter(s => s.parent === m.value);
                    return (
                      <Box key={m.value} sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: access === 'none' ? 'divider'
                          : access === 'view' ? 'info.light' : 'success.light',
                        bgcolor: access === 'none' ? 'transparent'
                          : access === 'view' ? 'info.50' : 'success.50',
                        overflow: 'hidden',
                      }}>
                        {/* Fila principal del módulo */}
                        <Stack direction="row" alignItems="center"
                          justifyContent="space-between"
                          sx={{ px: 1.5, py: 0.75 }}
                        >
                          <Typography variant="body2" color={access === 'none' ? 'text.disabled' : 'text.primary'}>
                            {m.label}
                          </Typography>
                          <ToggleButtonGroup
                            value={access}
                            exclusive
                            size="small"
                            onChange={(_, v) => v && setModuleAccess(m.value, v)}
                            sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1, fontSize: 11 } }}
                          >
                            <ToggleButton value="none">
                              <Tooltip title="Sin acceso">
                                <BlockIcon sx={{ fontSize: 14 }} />
                              </Tooltip>
                            </ToggleButton>
                            {canBeViewOnly && (
                              <ToggleButton value="view" sx={{ color: access === 'view' ? 'info.main' : undefined }}>
                                <Tooltip title="Solo vista">
                                  <VisibilityIcon sx={{ fontSize: 14 }} />
                                </Tooltip>
                              </ToggleButton>
                            )}
                            <ToggleButton value="write" sx={{ color: access === 'write' ? 'success.main' : undefined }}>
                              <Tooltip title={canBeViewOnly ? 'Escritura completa' : 'Acceso'}>
                                <EditNoteIcon sx={{ fontSize: 14 }} />
                              </Tooltip>
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>

                        {/* Sub-permisos (solo cuando el módulo tiene acceso y tiene secciones) */}
                        {access !== 'none' && subs.length > 0 && (
                          <Box sx={{
                            px: 2, py: 0.75,
                            borderTop: '1px dashed',
                            borderColor: access === 'view' ? 'info.light' : 'success.light',
                            bgcolor: 'background.paper',
                          }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}
                              sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Secciones adicionales
                            </Typography>
                            <FormGroup row sx={{ gap: 0 }}>
                              {subs.map(s => (
                                <FormControlLabel
                                  key={s.bit}
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={(form.modules & s.bit) !== 0}
                                      onChange={e => setForm(f => ({
                                        ...f,
                                        modules: e.target.checked
                                          ? f.modules | s.bit
                                          : f.modules & ~s.bit,
                                      }))}
                                      sx={{ py: 0.25 }}
                                    />
                                  }
                                  label={
                                    <Typography variant="caption" color="text.secondary">
                                      {s.label}
                                    </Typography>
                                  }
                                  sx={{ mr: 2, mb: 0 }}
                                />
                              ))}
                            </FormGroup>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {editing && (
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Estado</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary">Inactivo</Typography>
                  <Switch
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    color="success"
                  />
                  <Typography variant="body2" color="success.main">Activo</Typography>
                </Stack>
              </Stack>
            )}

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving ||
              !form.fullName.trim() || (!editing && !form.username.trim())}
          >
            {saving ? <CircularProgress size={18} /> : (editing ? 'Guardar Cambios' : 'Crear Usuario')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── CSV Import Dialog ──────────────────────────────────────────────── */}
      <Dialog open={csvOpen} onClose={() => setCsvOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Importar Usuarios desde CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            El archivo CSV debe tener columnas: <strong>username, fullname, email, position, password, role, modules</strong>.<br />
            Si no se especifica <em>password</em>, se usará <code>Pandora123!</code>. Si ya existe el usuario, se omite.
          </Typography>
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ mb: 2 }}>
            Seleccionar archivo CSV
            <input type="file" accept=".csv" hidden ref={csvFileRef} onChange={handleCsvFile} />
          </Button>
          {csvError && <Alert severity="error" sx={{ mb: 1 }}>{csvError}</Alert>}
          {csvResult && (
            <Alert severity="success" sx={{ mb: 1 }}>
              Resultado: <strong>{csvResult.created}</strong> creados, <strong>{csvResult.skipped}</strong> omitidos
              {csvResult.errors?.length > 0 && ` — Errores: ${csvResult.errors.join(', ')}`}
            </Alert>
          )}
          {csvRows.length > 0 && !csvResult && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                {csvRows.length} fila(s) detectadas:
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Username','Nombre','Email','Puesto','Rol','Módulos'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvRows.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.username}</TableCell>
                        <TableCell>{r.fullName}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.position}</TableCell>
                        <TableCell>{r.role}</TableCell>
                        <TableCell>{r.modules}</TableCell>
                      </TableRow>
                    ))}
                    {csvRows.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                          ...y {csvRows.length - 10} más
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsvOpen(false)}>Cerrar</Button>
          <Button
            variant="contained" onClick={handleCsvImport}
            disabled={csvRows.length === 0 || csvImporting || !!csvResult}
            startIcon={csvImporting ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          >
            {csvImporting ? 'Importando...' : `Importar ${csvRows.length} usuarios`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
