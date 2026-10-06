import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Select, MenuItem, Switch, Chip, CircularProgress, Snackbar, Alert,
  TextField, InputAdornment, Avatar, Stack,
} from '@mui/material';
import SearchIcon            from '@mui/icons-material/Search';
import ManageAccountsIcon    from '@mui/icons-material/ManageAccounts';
import { superAdminApi } from '../../api/pandoraApi';

const ROLE_OPTIONS = [
  { value: 'SuperAdmin',   label: 'Super Admin',  color: 'secondary' },
  { value: 'Admin',        label: 'Administrador', color: 'primary' },
  { value: 'Inventarista', label: 'Inventarista',  color: 'info' },
  { value: 'User',         label: 'Usuario',       color: 'default' },
];

export default function UsersRolesPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState('');
  const [busy,    setBusy]    = useState(null);   // id en proceso
  const [snack,   setSnack]   = useState(null);   // { sev, msg }

  const load = () => {
    setLoading(true);
    superAdminApi.listUsers()
      .then(r => setUsers(r.data))
      .catch(() => setSnack({ sev: 'error', msg: 'No se pudieron cargar los usuarios.' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (u, role) => {
    if (role === u.role) return;
    setBusy(u.id);
    try {
      await superAdminApi.setRole(u.id, role);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
      setSnack({ sev: 'success', msg: `Rol de ${u.username} cambiado a ${role}.` });
    } catch {
      setSnack({ sev: 'error', msg: 'No se pudo cambiar el rol.' });
    } finally { setBusy(null); }
  };

  const toggleActive = async (u) => {
    setBusy(u.id);
    try {
      await superAdminApi.toggleActive(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    } catch {
      setSnack({ sev: 'error', msg: 'No se pudo cambiar el estado.' });
    } finally { setBusy(null); }
  };

  const filtered = users.filter(u => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [u.username, u.fullName, u.email, u.tenantName, u.role]
      .some(v => (v || '').toLowerCase().includes(s));
  });

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <Avatar sx={{ bgcolor: 'primary.main' }}><ManageAccountsIcon /></Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary.main">Usuarios y Roles</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión global de roles a través de todos los clientes (solo Super Admin).
          </Typography>
        </Box>
      </Stack>

      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          <TextField
            size="small" placeholder="Buscar por usuario, nombre, correo o cliente…"
            value={q} onChange={e => setQ(e.target.value)} fullWidth sx={{ mb: 2, maxWidth: 480 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />

          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Usuario', 'Cliente', 'Rol', 'Activo'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((u, i) => (
                    <TableRow key={u.id} hover sx={{ bgcolor: i % 2 ? 'grey.50' : 'white' }}>
                      <TableCell>
                        <Typography fontWeight={600} fontSize="0.9rem">{u.fullName || u.username}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.username}{u.email ? ` · ${u.email}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={u.tenantName} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small" value={u.role}
                          onChange={e => changeRole(u, e.target.value)}
                          disabled={busy === u.id}
                          sx={{ minWidth: 160 }}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch checked={u.isActive} onChange={() => toggleActive(u)} disabled={busy === u.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Sin usuarios que coincidan.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
