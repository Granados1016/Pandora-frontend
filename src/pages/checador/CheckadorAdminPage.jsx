import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem,
  Select, FormControl, InputLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Tooltip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import DownloadIcon    from '@mui/icons-material/Download';
import LocationOnIcon  from '@mui/icons-material/LocationOn';
import AccessTimeIcon  from '@mui/icons-material/AccessTime';
import PeopleIcon      from '@mui/icons-material/People';
import LoginIcon       from '@mui/icons-material/Login';
import LogoutIcon      from '@mui/icons-material/Logout';
import WarningIcon     from '@mui/icons-material/Warning';
import MapIcon         from '@mui/icons-material/Map';
import { checadorApi } from '../../api/pandoraApi';
import TablePager, { useTablePager } from '../../components/TablePager';

function utc(d) {
  if (!d) return null;
  const s = String(d);
  return new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');
}
function fmtDateTime(d) {
  if (!d) return '—';
  return utc(d).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' });
}

export default function CheckadorAdminPage() {
  const [registros, setRegistros] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [mapReg,    setMapReg]    = useState(null);
  const { page, setPage, pageSize, setPageSize, pagedRows } = useTablePager(registros); // registro a mostrar en mapa

  const [fUsuario, setFUsuario] = useState('');
  const [fTipo,    setFTipo]    = useState('');
  const [fDesde,   setFDesde]   = useState('');
  const [fHasta,   setFHasta]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rReg, rStats] = await Promise.all([
        checadorApi.getRegistros({
          userId: fUsuario || undefined,
          tipo:   fTipo    || undefined,
          desde:  fDesde   || undefined,
          hasta:  fHasta   || undefined,
        }),
        checadorApi.getStats(),
      ]);
      setRegistros(rReg.data);
      setStats(rStats.data);
    } catch { }
    finally { setLoading(false); }
  }, [fUsuario, fTipo, fDesde, fHasta]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const res = await checadorApi.exportCsv({ desde: fDesde || undefined, hasta: fHasta || undefined });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'asistencia.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const KPI = ({ icon, label, val, color }) => (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 2, minWidth: 110, flex: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ color }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color={color} lineHeight={1}>{val ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </Stack>
    </Paper>
  );

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={1.5} alignItems={{ sm:'center' }} justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Asistencia — Administración</Typography>
            {loading && <CircularProgress size={18} />}
          </Stack>
          <Tooltip title="Exportar CSV">
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} sx={{ borderRadius: 2 }}>CSV</Button>
          </Tooltip>
        </Stack>

        {/* KPIs */}
        {stats && (
          <Stack direction="row" spacing={1} flexWrap="wrap" mt={1.5} useFlexGap>
            <KPI icon={<LoginIcon />}    label="Entradas hoy"  val={stats.entradasHoy}        color="primary.main" />
            <KPI icon={<LogoutIcon />}   label="Salidas hoy"   val={stats.salidasHoy}         color="warning.main" />
            <KPI icon={<PeopleIcon />}   label="Usuarios"      val={stats.usuariosRegistrados} color="info.main" />
            <KPI icon={<AccessTimeIcon />} label="Este mes"    val={stats.esteMes}            color="text.secondary" />
            <KPI icon={<WarningIcon />}  label="Fuera de zona" val={stats.fueraDeZona}        color="error.main" />
          </Stack>
        )}

        {/* Filtros */}
        <Stack direction={{ xs:'column', sm:'row' }} spacing={1} mt={1.5} flexWrap="wrap">
          <TextField size="small" placeholder="Buscar usuario…" value={fUsuario}
            onChange={e => setFUsuario(e.target.value)} sx={{ minWidth: 180 }} />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={fTipo} label="Tipo" onChange={e => setFTipo(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="Entrada">Entrada</MenuItem>
              <MenuItem value="Salida">Salida</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Desde" type="date" value={fDesde}
            onChange={e => setFDesde(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Hasta" type="date" value={fHasta}
            onChange={e => setFHasta(e.target.value)} InputLabelProps={{ shrink: true }} />
          {(fUsuario || fTipo || fDesde || fHasta) && (
            <Button size="small" onClick={() => { setFUsuario(''); setFTipo(''); setFDesde(''); setFHasta(''); }}>
              Limpiar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Tabla */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Usuario','Tipo','Fecha y hora','Precisión GPS','Zona','Notas','Mapa'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {registros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    {loading ? 'Cargando…' : 'Sin registros'}
                  </TableCell>
                </TableRow>
              )}
              {pagedRows.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{r.userName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.tipo}
                      color={r.tipo === 'Entrada' ? 'primary' : 'warning'} variant="outlined"
                      icon={r.tipo === 'Entrada' ? <LoginIcon fontSize="inherit" /> : <LogoutIcon fontSize="inherit" />} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2">{fmtDateTime(r.timestamp)}</Typography>
                  </TableCell>
                  <TableCell>
                    {r.lat
                      ? <Typography variant="caption">±{Math.round(r.precision ?? 0)}m</Typography>
                      : <Typography variant="caption" color="text.disabled">Sin GPS</Typography>}
                  </TableCell>
                  <TableCell>
                    {r.esDentroDeZona === null || r.esDentroDeZona === undefined
                      ? <Chip size="small" label="N/A" />
                      : r.esDentroDeZona
                      ? <Chip size="small" label="✓ Dentro" color="success" />
                      : <Chip size="small" label="⚠ Fuera" color="error" />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{r.notas || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    {r.lat && (
                      <Tooltip title="Ver en mapa">
                        <IconButton size="small" onClick={() => setMapReg(r)}>
                          <LocationOnIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePager total={registros.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} />
      </Paper>

      {/* Modal mapa */}
      {mapReg && (
        <Dialog open fullWidth maxWidth="md" onClose={() => setMapReg(null)}>
          <DialogTitle>
            Ubicación — {mapReg.userName} · {mapReg.tipo} · {fmtDateTime(mapReg.timestamp)}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <iframe
              title="mapa"
              width="100%"
              height="420"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapReg.lng - 0.005},${mapReg.lat - 0.005},${mapReg.lng + 0.005},${mapReg.lat + 0.005}&layer=mapnik&marker=${mapReg.lat},${mapReg.lng}`}
            />
          </DialogContent>
          <DialogActions>
            <Button
              size="small"
              href={`https://www.google.com/maps?q=${mapReg.lat},${mapReg.lng}`}
              target="_blank" rel="noopener">
              Abrir en Google Maps
            </Button>
            <Button onClick={() => setMapReg(null)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
