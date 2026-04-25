import React from 'react';
import {
  Box, Typography, Chip, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { statusColor, statusLabel } from '../utils/statusHelpers';

export default function RecipientTable({ recipients, onRemove, readOnly = false }) {
  if (!recipients || recipients.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No hay destinatarios. Carga un archivo CSV o agrega manualmente.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {recipients.length} destinatario{recipients.length !== 1 ? 's' : ''} cargado{recipients.length !== 1 ? 's' : ''}
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 380 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Correo</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Usuario</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Contraseña</TableCell>
              {!readOnly && <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }} />}
              {readOnly && <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Estado</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {recipients.map((r, i) => (
              <TableRow key={r.id ?? i} hover>
                <TableCell>{r.fullName || r.FullName}</TableCell>
                <TableCell sx={{ color: 'primary.main' }}>{r.email || r.Email}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.username || r.Username}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary' }}>
                  {'•'.repeat(Math.min((r.password || r.Password || '').length, 8))}
                </TableCell>
                {!readOnly && (
                  <TableCell align="right" padding="none">
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => onRemove(i)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
                {readOnly && (
                  <TableCell>
                    <Chip
                      label={statusLabel(r.status || r.Status)}
                      color={statusColor(r.status || r.Status)}
                      size="small"
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
