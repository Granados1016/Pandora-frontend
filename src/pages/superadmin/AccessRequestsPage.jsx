import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Select, MenuItem, Chip, CircularProgress, Snackbar, Alert,
  Avatar, Stack, Button, ToggleButtonGroup, ToggleButton, Tooltip,
} from '@mui/material';
import HowToRegIcon       from '@mui/icons-material/HowToReg';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CancelIcon         from '@mui/icons-material/Cancel';
import { accessRequestsApi } from '../../api/pandoraApi';

const ROLE_OPTIONS = [
  { value: 'User',         label: 'Usuario' },
  { value: 'Inventarista', label: 'Inventarista' },
  { value: 'Admin',        label: 'Administrador' },
  { value: 'SuperAdmin',   label: 'Super Admin' },
];

const STATUS_CHIP = {
  pending:  { label: 'Pendiente', color: 'warning' },
  approved: { label: 'Aprobada',  color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
};

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return s; }
}

export default function AccessRequestsPage() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('pending');
  const [busy,    setBusy]    = useState(null);         // id en proceso
  const [roleSel, setRoleSel] = useState({});           // { [id]: role }
  const [snack,   setSnack]   = useState(null);

  const load = (status = filter) => {
    setLoading(true);
    accessRequestsApi.list(status)
      .then(r => {
        setRows(r.data);
        setRoleSel(prev => {
          const next = { ...prev };
          r.data.forEach(x => { if (!next[x.id]) next[x.id] = 'User'; });
          return next;
        });
      })
      .catch(() => setSnack({ sev: 'error', msg: 'No se pudieron cargar las solicitudes.' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(filter); /* eslint-disable-next-line */ }, [filter]);

  const approve = async (row) => {
    setBusy(row.id);
    try {
      const role = roleSel[row.id] || 'User';
      const res = await accessRequestsApi.approve(row.id, { role });
      const uname = res?.data?.username || row.email;
      setSnack({ sev: 'success', msg: `Aprobada: se creó el usuario "${uname}" (${role}). Ya puede entrar con Google.` });
      setRows(prev => prev.filter(x => x.id !== row.id));
    } catch (e) {
      setSnack({ sev: 'error', msg: e?.response?.data || 'No se pudo aprobar la solicitud.' });
    } finally { setBusy(null); }
  };

  const reject = async (row) => {
    setBusy(row.id);
    try {
      await accessRequestsApi.reject(row.id);
      setSnack({ sev: 'info', msg: `Solicitud de ${row.email} rechazada.` });
      setRows(prev => prev.filter(x => x.id !== row.id));
    } catch {
      setSnack({ sev: 'error', msg: 'No se pudo rechazar la solicitud.' });
    } finally { setBusy(null); }
  };

  const isPending = filter === 'pending';

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <Avatar sx={{ bgcolor: 'primary.main' }}><HowToRegIcon /></Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={800} color="primary.main">Solicitudes de acceso</Typography>
          <Typography variant="body2" color="text.secondary">
            Personas que entraron con su cuenta institucional y esperan tu aprobación.
            Al aprobar se crea su usuario y en su siguiente inicio con Google ya entran.
          </Typography>
        </Box>
      </Stack>

      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          <ToggleButtonGroup
            size="small" exclusive value={filter}
            onChange={(_, v) => v && setFilter(v)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="pending">Pendientes</ToggleButton>
            <ToggleButton value="approved">Aprobadas</ToggleButton>
            <ToggleButton value="rejected">Rechazadas</ToggleButton>
            <ToggleButton value="all">Todas</ToggleButton>
          </ToggleButtonGroup>

          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Solicitante', 'Puesto', 'Fecha', isPending ? 'Rol a asignar' : 'Estado', 'Acciones'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={row.id} hover sx={{ bgcolor: i % 2 ? 'grey.50' : 'white' }}>
                      <TableCell>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Avatar src={row.picture || undefined} sx={{ width: 34, height: 34 }}>
                            {(row.fullName || row.email || '?').charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} fontSize="0.9rem">{row.fullName || '(sin nombre)'}</Typography>
                            <Typography variant="caption" color="text.secondary">{row.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.position || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtDate(row.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <Select
                            size="small" value={roleSel[row.id] || 'User'}
                            onChange={e => setRoleSel(s => ({ ...s, [row.id]: e.target.value }))}
                            disabled={busy === row.id}
                            sx={{ minWidth: 150 }}
                          >
                            {ROLE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                          </Select>
                        ) : (
                          <Chip
                            size="small"
                            label={STATUS_CHIP[row.status]?.label || row.status}
                            color={STATUS_CHIP[row.status]?.color || 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small" variant="contained" color="success"
                              startIcon={busy === row.id ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
                              disabled={busy === row.id} onClick={() => approve(row)}
                            >
                              Aprobar
                            </Button>
                            <Tooltip title="Rechazar solicitud">
                              <span>
                                <Button
                                  size="small" variant="outlined" color="error"
                                  startIcon={<CancelIcon />}
                                  disabled={busy === row.id} onClick={() => reject(row)}
                                >
                                  Rechazar
                                </Button>
                              </span>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {row.decidedBy ? `por ${row.decidedBy}` : ''}
                            {row.decidedAt ? ` · ${fmtDate(row.decidedAt)}` : ''}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {isPending ? 'No hay solicitudes pendientes.' : 'Sin registros.'}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={!!snack} autoHideDuration={4500} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
