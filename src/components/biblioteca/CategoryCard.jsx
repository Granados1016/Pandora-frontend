import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Box, Typography, Chip } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export default function CategoryCard({ categoria }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/biblioteca/categorias/${categoria.id}`)}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {categoria.icono ? (
                <span>{categoria.icono}</span>
              ) : (
                <MenuBookIcon sx={{ color: 'white', fontSize: 28 }} />
              )}
            </Box>

            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {categoria.nombre}
              </Typography>
              {categoria.descripcion && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {categoria.descripcion}
                </Typography>
              )}
              <Chip
                label={`${categoria.totalLibros} libro${categoria.totalLibros !== 1 ? 's' : ''}`}
                size="small"
                color="secondary"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
