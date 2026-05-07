import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  LinearProgress,
  Pagination,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';

import api from '../../api/pandoraApi';

// ── Chip de acción ────────────────────────────────────────────────────────────
function ActionChip({ action }) {
  const colorMap = {
    Create: 'success',
    Upload: 'success',
    Delete: 'error',
    Update: 'warning',
    Edit:   'warning',
    Login:  'info',
  };
  const color = colorMap[action] ?? 'default';
  return <Chip size="small" label={action} color={color} />;
}

// ── Hook useAudit ─────────────────────────────────────────────────────────────
function useAudit() {
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pageSize]                    = useState(50);
  const [totalPages, setTotalPages]   = useState(1);
  const [search, setSearch]           = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [modules, setModules]         = useState([]);
  const [modulesError, setModulesError] = useState(false);

  // Cargar módulos disponibles al montar
  useEffect(() => {
    api.get('/audit/modules')
      .then(({ data }) => setModules(Array.isArray(data) ? data : []))
      .catch(() => setModulesError(true));
  }, []);

  const fetchLogs = useCallback(async (currentPage, currentSearch, currentModule) => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit', {
        params: {
          search: currentSearch || undefined,
          module: currentModule || undefined,
          page:   currentPage,
          pageSize,
        },
      });
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setLogs(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchLogs(page, search, moduleFilter);
  }, [page, search, moduleFilter, fetchLogs]);

  // Al cambiar filtros, resetear a página 1
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleModuleChange = (value) => {
    setModuleFilter(value);
    setPage(1);
  };

  return {
    logs,
    loading,
    total,
    page,
    setPage,
    pageSize,
    totalPages,
    search,
    setSearch: handleSearchChange,
    moduleFilter,
    setModuleFilter: handleModuleChange,
    modules,
    modulesError,
  };
}

// ── Página de Auditoría ───────────────────────────────────────────────────────
export default function AuditPage() {
  const {
    logs,
    loading,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    moduleFilter,
    setModuleFilter,
    modules,
    modulesError,
  } = useAudit();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <SecurityIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Log de Auditoría
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registro completo de acciones realizadas en el sistema
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar por usuario, entidad, detalles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 240 }}
          />

          <TextField
            select
            size="small"
            label="Módulo"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            sx={{ minWidth: 200 }}
            disabled={modulesError}
          >
            <MenuItem value="">Todos los módulos</MenuItem>
            {modules.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Barra de progreso */}
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Tabla */}
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HistoryIcon fontSize="small" />
                  Fecha
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Acción</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Módulo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ID Entidad</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Detalles</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!loading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box
                    sx={{
                      py: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <SecurityIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron registros de auditoría
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {logs.map((log) => (
              <TableRow
                key={log.id}
                hover
                sx={{ '&:last-child td': { border: 0 } }}
              >
                {/* Fecha */}
                <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                  {new Date(log.createdAt ?? log.timestamp ?? log.date).toLocaleString('es-MX')}
                </TableCell>

                {/* Usuario */}
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {log.userName ?? log.username ?? log.user ?? '—'}
                  </Typography>
                </TableCell>

                {/* Acción */}
                <TableCell>
                  <ActionChip action={log.action} />
                </TableCell>

                {/* Módulo */}
                <TableCell>
                  <Typography variant="body2">
                    {log.module ?? '—'}
                  </Typography>
                </TableCell>

                {/* ID Entidad */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {log.entityId ?? log.targetId ?? '—'}
                  </Typography>
                </TableCell>

                {/* Detalles */}
                <TableCell sx={{ maxWidth: 280 }}>
                  <Tooltip
                    title={log.details ?? log.description ?? ''}
                    placement="top-start"
                    arrow
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 280,
                        cursor: 'default',
                      }}
                    >
                      {log.details ?? log.description ?? '—'}
                    </Typography>
                  </Tooltip>
                </TableCell>

                {/* IP */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {log.ipAddress ?? log.ip ?? '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
