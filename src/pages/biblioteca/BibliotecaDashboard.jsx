import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CircularProgress,
  Alert, Chip, LinearProgress, Divider, Button,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CategoryIcon from '@mui/icons-material/Category';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { librosApi } from '../../api/bibliotecaApi';

function StatCard({ icon, label, value, color = 'primary.main' }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 2, bgcolor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {React.cloneElement(icon, { sx: { color: 'white', fontSize: 24 } })}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function BibliotecaDashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    librosApi.dashboard()
      .then(res => setData(res.data))
      .catch(() => setError('Error al cargar el dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!data)   return null;

  const maxCategoria = Math.max(...(data.porCategoria?.map(c => c.total) ?? [1]), 1);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Dashboard — Biblioteca Virtual</Typography>
          <Typography variant="body2" color="text.secondary">Resumen del acervo digital</Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate('/biblioteca')}>
          Ir a la Biblioteca
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} md={3}>
          <StatCard icon={<MenuBookIcon />} label="Total de libros"    value={data.totalLibros}    color="primary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<CheckCircleIcon />} label="Libros activos" value={data.totalActivos}   color="success.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<CategoryIcon />} label="Categorías"        value={data.totalCategorias} color="secondary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<StorageIcon />} label="Almacenamiento"     value={formatBytes(data.tamanoTotalBytes)} color="#455a64" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Libros por categoría */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Libros por categoría</Typography>
              {data.porCategoria?.length === 0 ? (
                <Typography color="text.secondary">Sin datos.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {data.porCategoria?.map(cat => (
                    <Box key={cat.nombre}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {cat.icono && <span style={{ marginRight: 6 }}>{cat.icono}</span>}
                          {cat.nombre}
                        </Typography>
                        <Chip label={cat.total} size="small" color="primary" />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(cat.total / maxCategoria) * 100}
                        sx={{ borderRadius: 2, height: 6 }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Libros recientes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Agregados recientemente</Typography>
              {data.recientes?.length === 0 ? (
                <Typography color="text.secondary">Sin libros recientes.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {data.recientes?.map((libro, i) => (
                    <React.Fragment key={libro.id}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, px: 1 }}
                        onClick={() => navigate(`/biblioteca/libros/${libro.id}`)}
                      >
                        <Box sx={{
                          width: 36, height: 36, borderRadius: 1, bgcolor: 'primary.main',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <MenuBookIcon sx={{ color: 'white', fontSize: 18 }} />
                        </Box>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={600} noWrap>{libro.titulo}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{libro.autor}</Typography>
                        </Box>
                        <Chip label={libro.categoriaNombre} size="small" variant="outlined" />
                      </Box>
                      {i < data.recientes.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
