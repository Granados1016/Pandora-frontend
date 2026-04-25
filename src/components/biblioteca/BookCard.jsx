import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardActionArea, Box,
  Typography, Chip, IconButton, Tooltip,
} from '@mui/material';
import FavoriteIcon       from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PdfThumbnail       from './PdfThumbnail';
import { librosApi }      from '../../api/bibliotecaApi';

// Colores de portada por cuatrimestre (coinciden con BibliotecaHome)
const CUATRI_COLORS = [
  '#1b5e20', '#0d47a1', '#bf360c',
  '#880e4f', '#4a148c', '#006064',
];
function colorPorCategoria(nombre = '') {
  const n = nombre.toLowerCase();
  if (n.includes('primer'))  return CUATRI_COLORS[0];
  if (n.includes('segundo')) return CUATRI_COLORS[1];
  if (n.includes('tercer'))  return CUATRI_COLORS[2];
  if (n.includes('cuarto'))  return CUATRI_COLORS[3];
  if (n.includes('quinto'))  return CUATRI_COLORS[4];
  if (n.includes('sexto'))   return CUATRI_COLORS[5];
  return '#37474f';
}

export default function BookCard({ libro, isFavorito, onToggleFavorito }) {
  const navigate = useNavigate();
  const pdfUrl   = librosApi.getVisualizarUrl(libro.id);
  const bgColor  = colorPorCategoria(libro.categoriaNombre);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Tooltip title={isFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
        <IconButton
          size="small"
          onClick={e => { e.stopPropagation(); onToggleFavorito?.(libro.id); }}
          sx={{
            position: 'absolute', top: 8, right: 8, zIndex: 2,
            bgcolor: 'rgba(255,255,255,0.85)',
            '&:hover': { bgcolor: 'white' },
          }}
        >
          {isFavorito
            ? <FavoriteIcon fontSize="small" color="error" />
            : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <CardActionArea onClick={() => navigate(`/biblioteca/libros/${libro.id}`)} sx={{ flexGrow: 1 }}>
        {/* ── Portada ─────────────────────────────────────────────────────── */}
        {libro.rutaPortada ? (
          <Box
            component="img"
            height={180}
            src={`/api/storage/portadas/${libro.rutaPortada.split('/').pop()}`}
            alt={libro.titulo}
            sx={{ width: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <PdfThumbnail
            url={pdfUrl}
            height={180}
            fallbackColor={bgColor}
          />
        )}

        {/* ── Info ────────────────────────────────────────────────────────── */}
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap title={libro.titulo}>
            {libro.titulo}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {libro.autor !== '—' ? libro.autor : ''}
          </Typography>
          {libro.anioPublicacion && (
            <Typography variant="caption" color="text.disabled">
              {libro.anioPublicacion}
            </Typography>
          )}
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {libro.subcategoriaNombre && (
              <Chip label={libro.subcategoriaNombre} size="small" variant="outlined"
                sx={{ fontSize: 10, height: 18 }} />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
