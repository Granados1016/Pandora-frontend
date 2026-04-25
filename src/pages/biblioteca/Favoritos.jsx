import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, CircularProgress, Alert,
  IconButton, Tooltip, Card, CardContent, CardActionArea, CardMedia,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { favoritosApi } from '../../api/bibliotecaApi';

export default function Favoritos() {
  const navigate = useNavigate();
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    favoritosApi.getMios()
      .then(res => setFavoritos(res.data))
      .catch(() => setError('Error al cargar favoritos.'))
      .finally(() => setLoading(false));
  }, []);

  const handleEliminar = async (libroId) => {
    try {
      await favoritosApi.eliminar(libroId);
      setFavoritos(prev => prev.filter(f => f.libroId !== libroId));
    } catch { /* silencioso */ }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" mb={3}>Mis Favoritos</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {favoritos.length === 0 ? (
        <Alert severity="info">No tienes libros en favoritos todavía.</Alert>
      ) : (
        <Grid container spacing={2}>
          {favoritos.map(f => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={f.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <Tooltip title="Quitar de favoritos">
                  <IconButton size="small" onClick={() => handleEliminar(f.libroId)}
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1,
                      bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'white' } }}>
                    <FavoriteIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
                <CardActionArea onClick={() => navigate(`/biblioteca/libros/${f.libroId}`)}>
                  {f.libroPortada ? (
                    <CardMedia component="img" height="160"
                      image={`/api/storage/portadas/${f.libroPortada?.split('/').pop()}`} alt={f.libroTitulo} />
                  ) : (
                    <Box sx={{ height: 160, bgcolor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MenuBookIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.4)' }} />
                    </Box>
                  )}
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{f.libroTitulo}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">{f.libroAutor}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
