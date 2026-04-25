import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, CircularProgress, Alert, Divider,
  Pagination, Chip, Button, Card, CardActionArea, CardContent,
  Stack, LinearProgress,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import AutoStoriesIcon   from '@mui/icons-material/AutoStories';
import SearchIcon        from '@mui/icons-material/Search';
import ArrowForwardIcon  from '@mui/icons-material/ArrowForward';
import SyncIcon          from '@mui/icons-material/Sync';

import { categoriasApi, librosApi, favoritosApi } from '../../api/bibliotecaApi';
import BookCard   from '../../components/biblioteca/BookCard';
import SearchBar  from '../../components/biblioteca/SearchBar';
import { useAuth } from '../../hooks/useAuth';

// Paleta de colores para cada cuatrimestre (índice 0 = 1er cuatrimestre)
const CUATRIMESTRE_COLORS = [
  { bg: '#1b5e20', light: '#e8f5e9', accent: '#43a047' },  // 1ro — Verde
  { bg: '#0d47a1', light: '#e3f2fd', accent: '#1e88e5' },  // 2do — Azul
  { bg: '#bf360c', light: '#fff3e0', accent: '#fb8c00' },  // 3ro — Naranja
  { bg: '#880e4f', light: '#fce4ec', accent: '#e91e63' },  // 4to — Rosa
  { bg: '#4a148c', light: '#f3e5f5', accent: '#9c27b0' },  // 5to — Morado
  { bg: '#006064', light: '#e0f7fa', accent: '#00acc1' },  // 6to — Teal
];
const CUATRIMESTRE_ICONS = ['📗', '📘', '📙', '📕', '📔', '📓'];

function getColor(orden) {
  const idx = Math.max(0, Math.min((orden || 1) - 1, CUATRIMESTRE_COLORS.length - 1));
  return CUATRIMESTRE_COLORS[idx];
}

// ─── Tarjeta de cuatrimestre ─────────────────────────────────────────────────
function CuatrimestreCard({ categoria, onClick }) {
  const color = getColor(categoria.orden);
  const icon  = CUATRIMESTRE_ICONS[Math.max(0, (categoria.orden || 1) - 1)];

  return (
    <Card elevation={0} sx={{
      borderRadius: 3, border: '1px solid', borderColor: color.accent + '50',
      overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${color.accent}30` },
    }}>
      <CardActionArea onClick={onClick}>
        <Box sx={{ bgcolor: color.bg, px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography fontSize={28}>{icon}</Typography>
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={800} color="white" noWrap>
              {categoria.nombre}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {categoria.totalLibros} libro{categoria.totalLibros !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <ArrowForwardIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
        </Box>
        <LinearProgress variant="determinate"
          value={Math.min(100, (categoria.totalLibros / 20) * 100)}
          sx={{ height: 3, bgcolor: color.light,
               '& .MuiLinearProgress-bar': { bgcolor: color.accent } }} />
        <CardContent sx={{ py: 1.2, px: 2.5, bgcolor: color.light }}>
          <Typography variant="caption" color="text.secondary">
            {categoria.descripcion || `Material del ${categoria.nombre}`}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ─── Tarjeta genérica ────────────────────────────────────────────────────────
function GenericCategoryCard({ categoria, onClick }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography fontSize={24}>{categoria.icono || '📚'}</Typography>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>{categoria.nombre}</Typography>
              <Typography variant="caption" color="text.secondary">
                {categoria.totalLibros} libro{categoria.totalLibros !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <ArrowForwardIcon fontSize="small" color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BibliotecaHome() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [categorias, setCategorias]       = useState([]);
  const [libros, setLibros]               = useState([]);
  const [totalLibros, setTotalLibros]     = useState(0);
  const [pagina, setPagina]               = useState(1);
  const [filtros, setFiltros]             = useState({});
  const [favoritos, setFavoritos]         = useState(new Set());
  const [loading, setLoading]             = useState(true);
  const [loadingLibros, setLoadingLibros] = useState(false);
  const [error, setError]                 = useState('');
  const [buscando, setBuscando]           = useState(false);

  const PAGINA_SIZE = 20;

  useEffect(() => {
    Promise.all([categoriasApi.getAll(), favoritosApi.getMios()])
      .then(([catRes, favRes]) => {
        setCategorias(catRes.data);
        setFavoritos(new Set(favRes.data.map(f => f.libroId)));
      })
      .catch(() => setError('Error al cargar la biblioteca.'))
      .finally(() => setLoading(false));
  }, []);

  const buscarLibros = useCallback(async (f = filtros, p = 1) => {
    setLoadingLibros(true);
    try {
      const res = await librosApi.buscar({ ...f, pagina: p, tamanoPagina: PAGINA_SIZE });
      setLibros(res.data.items);
      setTotalLibros(res.data.totalItems);
      setPagina(p);
    } catch { setError('Error al buscar libros.'); }
    finally { setLoadingLibros(false); }
  }, [filtros]);

  const handleSearch = (f) => {
    const activo = Object.values(f).some(v => v !== undefined && v !== '' && v !== null);
    setBuscando(activo);
    setFiltros(f);
    buscarLibros(f, 1);
  };

  const handleToggleFavorito = async (libroId) => {
    try {
      if (favoritos.has(libroId)) {
        await favoritosApi.eliminar(libroId);
        setFavoritos(prev => { const s = new Set(prev); s.delete(libroId); return s; });
      } else {
        await favoritosApi.agregar(libroId);
        setFavoritos(prev => new Set([...prev, libroId]));
      }
    } catch { /* silencioso */ }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  const cuatrimestres = categorias.filter(c => c.activo && c.orden >= 1 && c.orden <= 6)
                                   .sort((a, b) => a.orden - b.orden);
  const otrasCategs   = categorias.filter(c => c.activo && (c.orden < 1 || c.orden > 6));
  const totalPaginas  = Math.ceil(totalLibros / PAGINA_SIZE);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* Header */}
      <Box sx={{ mb: 4, p: 3, borderRadius: 3,
                 background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }}
               justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
              <AutoStoriesIcon sx={{ color: 'white', fontSize: 28 }} />
              <Typography variant="h4" fontWeight={800} color="white">Biblioteca Virtual</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              Educación Media Superior — iMET
            </Typography>
            <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" gap={0.5}>
              <Chip label={`${cuatrimestres.length} cuatrimestres`} size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
              <Chip label={`${categorias.reduce((s, c) => s + c.totalLibros, 0)} libros en total`}
                size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
            </Stack>
          </Box>
          {isAdmin && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<SyncIcon />} size="small"
                onClick={() => navigate('/biblioteca/admin')}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)',
                      '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                Gestionar
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Búsqueda */}
      <Box mb={4}>
        <SearchBar categorias={categorias} onSearch={handleSearch} loading={loadingLibros} />
      </Box>

      {/* Resultados de búsqueda */}
      {buscando && (
        <Box mb={4}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <SearchIcon color="primary" fontSize="small" />
            <Typography variant="h6" fontWeight={700}>Resultados</Typography>
            {totalLibros > 0 && <Chip label={totalLibros} size="small" color="primary" />}
          </Stack>
          {loadingLibros
            ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            : libros.length === 0
              ? <Alert severity="info">No se encontraron libros con esos criterios.</Alert>
              : <>
                  <Grid container spacing={2}>
                    {libros.map(libro => (
                      <Grid item xs={6} sm={4} md={3} lg={2} key={libro.id}>
                        <BookCard libro={libro} isFavorito={favoritos.has(libro.id)}
                          onToggleFavorito={handleToggleFavorito} />
                      </Grid>
                    ))}
                  </Grid>
                  {totalPaginas > 1 && (
                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination count={totalPaginas} page={pagina}
                        onChange={(_, p) => buscarLibros(filtros, p)} color="primary" />
                    </Box>
                  )}
                </>
          }
          <Divider sx={{ mt: 4, mb: 4 }} />
        </Box>
      )}

      {/* Cuatrimestres */}
      {cuatrimestres.length > 0 ? (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={700} mb={2}>Cuatrimestres</Typography>
          <Grid container spacing={2}>
            {cuatrimestres.map(cat => (
              <Grid item xs={12} sm={6} lg={4} key={cat.id}>
                <CuatrimestreCard categoria={cat}
                  onClick={() => navigate(`/biblioteca/categorias/${cat.id}`)} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        <Box textAlign="center" py={8} sx={{
          border: '2px dashed', borderColor: 'divider', borderRadius: 3, mb: 4 }}>
          <Typography fontSize={48} mb={2}>📚</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>Biblioteca sin contenido todavía</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {isAdmin
              ? 'Usa el botón "Sincronizar desde carpetas" en la sección de Gestión para importar el material.'
              : 'El administrador aún no ha importado el material bibliográfico.'}
          </Typography>
          {isAdmin && (
            <Button variant="contained" startIcon={<SyncIcon />}
              onClick={() => navigate('/biblioteca/admin')}>Ir a Gestionar</Button>
          )}
        </Box>
      )}

      {/* Otras categorías */}
      {otrasCategs.length > 0 && (
        <Box>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" fontWeight={700} mb={2}>Otras categorías</Typography>
          <Grid container spacing={2}>
            {otrasCategs.map(cat => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={cat.id}>
                <GenericCategoryCard categoria={cat}
                  onClick={() => navigate(`/biblioteca/categorias/${cat.id}`)} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
