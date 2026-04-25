import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  LinearProgress, IconButton, Tooltip, Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { historialApi } from '../../api/bibliotecaApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Historial() {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    historialApi.getMio()
      .then(res => setHistorial(res.data))
      .catch(() => setError('Error al cargar el historial.'))
      .finally(() => setLoading(false));
  }, []);

  const handleEliminar = async (libroId) => {
    try {
      await historialApi.eliminar(libroId);
      setHistorial(prev => prev.filter(h => h.libroId !== libroId));
    } catch { /* silencioso */ }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" mb={3}>Historial de Lectura</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {historial.length === 0 ? (
        <Alert severity="info">No has leído ningún libro todavía.</Alert>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Libro</TableCell>
                <TableCell>Progreso</TableCell>
                <TableCell>Última lectura</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historial.map(h => {
                const progreso = h.totalPaginas
                  ? Math.min(100, Math.round((h.ultimaPagina / h.totalPaginas) * 100))
                  : null;
                return (
                  <TableRow key={h.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/biblioteca/libros/${h.libroId}`)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <MenuBookIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{h.libroTitulo}</Typography>
                          <Typography variant="caption" color="text.secondary">{h.libroAutor}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {progreso !== null ? (
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Pág. {h.ultimaPagina} de {h.totalPaginas}</Typography>
                            <Typography variant="caption">{progreso}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={progreso} sx={{ borderRadius: 2, mt: 0.5 }} />
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Pág. {h.ultimaPagina}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {format(new Date(h.ultimaLectura), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <Tooltip title="Eliminar del historial">
                        <IconButton size="small" color="error" onClick={() => handleEliminar(h.libroId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
