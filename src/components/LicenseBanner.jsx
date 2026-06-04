import React, { useMemo } from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth.jsx';

/**
 * Banner que aparece en la parte superior del contenido cuando la licencia
 * del tenant está próxima a vencer. Solo visible para Admin.
 */
export default function LicenseBanner() {
  const { tenantBranding, isAdmin } = useAuth();

  const daysLeft = useMemo(() => {
    if (!tenantBranding?.expiresAt) return null;
    return Math.ceil((new Date(tenantBranding.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  }, [tenantBranding]);

  if (!isAdmin || daysLeft === null || daysLeft > 30) return null;

  const severity = daysLeft <= 5 ? 'error' : daysLeft <= 15 ? 'warning' : 'info';
  const title    = daysLeft <= 0
    ? '¡Licencia vencida!'
    : daysLeft === 1
    ? 'La licencia vence mañana'
    : `La licencia vence en ${daysLeft} días`;

  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity={severity} sx={{ borderRadius: 2 }}>
        <AlertTitle fontWeight={700}>{title}</AlertTitle>
        {daysLeft > 0
          ? `La licencia de ${tenantBranding.displayName} vence el ${new Date(tenantBranding.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}. Contacte al proveedor para renovar y evitar la suspensión del servicio.`
          : 'El sistema podría quedar inaccesible para los usuarios. Contacte al proveedor de Pandora inmediatamente.'}
      </Alert>
    </Box>
  );
}
