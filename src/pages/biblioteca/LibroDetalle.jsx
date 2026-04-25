import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, CircularProgress, Alert, Button,
  Chip, Divider, IconButton, Tooltip, Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import { librosApi, favoritosApi, historialApi } from '../../api/bibliotecaApi';
import PdfViewer from '../../components/biblioteca/PdfViewer';

export default function LibroDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [libro, setLibro]         = useState(null);
  const [isFavorito, setFavorito] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showPdf, setShowPdf]     = useState(false);

  useEffect(() => {
    Promise.all([
      librosApi.getById(id),
      favoritosApi.getMios(),
    ]).then(([libroRes, favRes]) => {
      setLibro(libroRes.data);
      setFavorito(favRes.data.some(f => f.libroId === id));
    }).catch(() => setError('Error al cargar el libro.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleFavorito = async () => {
    try {
      if (isFavorito) {
        await favoritosApi.eliminar(id);
        setFavorito(false);
      } else {
        await favoritosApi.agregar(id);
        setFavorito(true);
      }
    } catch { /* silencioso */ }
  };

  const handleLeer = async () => {
    setShowPdf(true);
    try {
      await historialApi.actualizar({ libroId: id, ultimaPagina: 1 });
    } catch { /* silencioso */ }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!libro)  return null;

  const pdfUrl = librosApi.getVisualizarUrl(id);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Atrás
      </Button>

      <Grid container spacing={4}>
        {/* Portada + info */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {libro.rutaPortada ? (
              <Box component="img"
                src={`/api/storage/portadas/${libro.rutaPortada?.split('/').pop()}`}
                alt={libro.titulo}
                sx={{ width: '100%', maxHeight: 400, objectFit: 'cover' }}
              />
            ) : (
              <Box sx={{
                height: 300, bgcolor: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MenuBookIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.4)' }} />
              </Box>
            )}
          </Paper>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" fullWidth startIcon={<MenuBookIcon />} onClick={handleLeer}>
                Leer aquí
              </Button>
              <Tooltip title={isFavorito ? 'Quitar favorito' : 'Agregar a favoritos'}>
                <IconButton onClick={handleToggleFavorito} color={isFavorito ? 'error' : 'default'}
                  sx={{ border: '1px solid', borderColor: 'divider' }}>
                  {isFavorito ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" fullWidth startIcon={<OpenInNewIcon />}
                onClick={() => window.open(pdfUrl, '_blank')}>
                Nueva pestaña
              </Button>
              <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}
                component="a" href={pdfUrl} download={`${libro.titulo}.pdf`}>
                Descargar
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Metadatos */}
        <Grid item xs={12} md={8} lg={9}>
          <Typography variant="h4" fontWeight={700}>{libro.titulo}</Typography>
          <Typography variant="h6" color="text.secondary" mb={2}>{libro.autor}</Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {libro.nivelEducativo && <Chip label={libro.nivelEducativo} color="primary" />}
            {libro.idioma && <Chip label={libro.idioma} variant="outlined" />}
            {libro.categoriaNombre && <Chip label={libro.categoriaNombre} color="secondary" variant="outlined" />}
            {libro.subcategoriaNombre && <Chip label={libro.subcategoriaNombre} variant="outlined" />}
          </Box>

          {libro.descripcion && (
            <Typography color="text.secondary" mb={3}>{libro.descripcion}</Typography>
          )}

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            {[
              { label: 'Editorial',  value: libro.editorial },
              { label: 'Año',        value: libro.anioPublicacion },
              { label: 'ISBN',       value: libro.isbn },
              { label: 'Páginas',    value: libro.totalPaginas },
            ].filter(f => f.value).map(f => (
              <Grid item xs={6} sm={3} key={f.label}>
                <Typography variant="caption" color="text.secondary" display="block">{f.label}</Typography>
                <Typography fontWeight={600}>{f.value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      {/* Visor PDF */}
      {showPdf && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" fontWeight={700} mb={2}>Lectura en línea</Typography>
          <PdfViewer url={pdfUrl} titulo={libro.titulo} />
        </Box>
      )}
    </Box>
  );
}
