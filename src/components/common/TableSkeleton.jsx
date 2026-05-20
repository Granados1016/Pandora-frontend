/**
 * Pandora — Loading Skeleton para tablas (#17)
 * Reemplaza el CircularProgress en tablas mientras cargan datos.
 */
import React from 'react';
import {
  Box, Skeleton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper,
} from '@mui/material';

/**
 * @param {number}   rows     - Número de filas de esqueleto (default: 6)
 * @param {number}   cols     - Número de columnas (default: 5)
 * @param {boolean}  bordered - Si usar Paper con borde (default: true)
 */
export function TableSkeleton({ rows = 6, cols = 5, bordered = true }) {
  const Wrap = bordered ? Paper : Box;
  const wrapProps = bordered
    ? { elevation: 0, sx: { border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' } }
    : {};

  return (
    <Wrap {...wrapProps}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              {Array.from({ length: cols }).map((_, i) => (
                <TableCell key={i}>
                  <Skeleton variant="text" width={i === 0 ? '60%' : '80%'} height={22} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((_, ri) => (
              <TableRow key={ri}>
                {Array.from({ length: cols }).map((_, ci) => (
                  <TableCell key={ci}>
                    <Skeleton
                      variant={ci === cols - 1 ? 'rounded' : 'text'}
                      width={ci === cols - 1 ? 60 : `${70 + (ci % 3) * 10}%`}
                      height={ci === cols - 1 ? 24 : 18}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Wrap>
  );
}

/**
 * Skeleton para tarjetas KPI / widgets
 */
export function KpiSkeleton({ count = 4 }) {
  return (
    <Box display="grid" gridTemplateColumns={`repeat(${Math.min(count, 4)}, 1fr)`} gap={1.5}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={32} sx={{ mt: 0.5 }} />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Skeleton para lista de items
 */
export function ListSkeleton({ rows = 5 }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Box flex={1}>
            <Skeleton variant="text" width={`${60 + (i % 3) * 10}%`} height={18} />
            <Skeleton variant="text" width="40%" height={14} />
          </Box>
          <Skeleton variant="rounded" width={60} height={24} />
        </Box>
      ))}
    </Box>
  );
}
