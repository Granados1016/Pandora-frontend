import { Box, Typography, Button, Paper } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: { xs: 4, sm: 6 },
          maxWidth: 460,
          width: '100%',
          textAlign: 'center',
          borderRadius: 3,
        }}
      >
        {/* Ícono */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <LockOutlinedIcon sx={{ color: 'white', fontSize: 36 }} />
        </Box>

        {/* Título */}
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Acceso no autorizado
        </Typography>

        {/* Descripción */}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          No tienes permiso para acceder a esta sección.
          Contacta al administrador si crees que esto es un error.
        </Typography>

        {/* Botón */}
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate(isAuthenticated ? '/' : '/login')}
          size="large"
          fullWidth
        >
          {isAuthenticated ? 'Volver al inicio' : 'Ir al login'}
        </Button>
      </Paper>
    </Box>
  );
}
