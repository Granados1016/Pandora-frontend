import { createTheme } from '@mui/material/styles';

const pandoraTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1a237e', light: '#534bae', dark: '#000051', contrastText: '#fff' },
    secondary: { main: '#e65100', light: '#ff833a', dark: '#ac1900', contrastText: '#fff' },
    background: { default: '#f0f2f5', paper: '#ffffff' },
    success: { main: '#2e7d32' },
    error: { main: '#c62828' },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});

export default pandoraTheme;
