import { createContext, useContext, useState, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeModeContext = createContext();

const baseTypography = {
  fontFamily: 'Inter, sans-serif',
  h4: { fontWeight: 700 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
};
const baseShape = { borderRadius: 10 };
const baseComponents = {
  MuiButton:  { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  MuiChip:    { styleOverrides: { root: { fontWeight: 600 } } },
};

// ── buildTheme acepta colores de tenant para white-label ─────────────────────
function buildTheme(mode, primaryColor = '#1a237e', secondaryColor = '#e65100') {
  return createTheme({
    palette: {
      mode,
      primary:   { main: primaryColor,   contrastText: '#fff' },
      secondary: { main: secondaryColor, contrastText: '#fff' },
      success:   { main: '#2e7d32' },
      error:     { main: '#c62828' },
      ...(mode === 'dark'
        ? { background: { default: '#0d1117', paper: '#161b27' } }
        : { background: { default: '#f0f2f5', paper: '#ffffff' } }),
    },
    typography: baseTypography,
    shape:      baseShape,
    components: {
      ...baseComponents,
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'dark'
              ? '0 2px 12px rgba(0,0,0,0.4)'
              : '0 2px 12px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: mode === 'dark' ? { backgroundImage: 'none' } : {},
        },
      },
    },
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem('pandora_theme') || 'light'
  );

  // Colores del tenant — se actualizan después del login desde App.jsx
  const [tenantColors, setTenantColors] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pandora_tenant') || 'null');
      return saved ? { primary: saved.primaryColor, secondary: saved.secondaryColor } : null;
    } catch { return null; }
  });

  const toggleMode = () => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('pandora_theme', next);
      return next;
    });
  };

  const theme = useMemo(
    () => buildTheme(mode, tenantColors?.primary, tenantColors?.secondary),
    [mode, tenantColors]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode, theme, setTenantColors }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeModeContext);
