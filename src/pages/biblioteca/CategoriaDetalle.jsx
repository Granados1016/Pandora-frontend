import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, CircularProgress, Alert,
  Chip, Button, Tabs, Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { categoriasApi, librosApi, favoritosApi } from '../../api/bibliotecaApi';
import BookCard from '../../components/biblioteca/BookCard';

export default function CategoriaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categoria, setCategoria]   = useState(null);
  const [libros, setLibros]         = useState([]);
  const [favoritos, setFavoritos]   = useState(new Set());
  const [tabIndex, setTabIndex]     = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    Promise.all([
      categoriasApi.getById(id),
      librosApi.getByCategoria(id),
      favoritosApi.getMios(),
    ]).then(([catRes, libRes, favRes]) => {
      setCategoria(catRes.data);
      setLibros(libRes.data);
      setFavoritos(new Set(favRes.data.map(f => f.libroId)));
    }).catch(() => setError('Error al cargar la categoría.'))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!categoria) return null;

  const subcats = categoria.subcategorias ?? [];
  const librosFiltrados = tabIndex === 0
    ? libros
    : libros.filter(l => l.subcategoriaId === subcats[tabIndex - 1]?.id);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/biblioteca')} sx={{ mb: 2 }}>
        Biblioteca
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        {categoria.icono && <Typography fontSize={36}>{categoria.icono}</Typography>}
        <Box>
          <Typography variant="h4">{categoria.nombre}</Typography>
          {categoria.descripcion && (
            <Typography color="text.secondary">{categoria.descripcion}</Typography>
          )}
        </Box>
        <Chip label={`${libros.length} libros`} color="secondary" sx={{ ml: 'auto' }} />
      </Box>

      {subcats.length > 0 && (
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }} variant="scrollable">
          <Tab label="Todos" />
          {subcats.map(s => <Tab key={s.id} label={s.nombre} />)}
        </Tabs>
      )}

      {librosFiltrados.length === 0 ? (
        <Alert severity="info">No hay libros en esta sección.</Alert>
      ) : (
        <Grid container spacing={2}>
          {librosFiltrados.map(libro => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={libro.id}>
              <BookCard
                libro={libro}
                isFavorito={favoritos.has(libro.id)}
                onToggleFavorito={handleToggleFavorito}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
