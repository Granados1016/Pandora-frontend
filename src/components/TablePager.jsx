import React from 'react';
import { Stack, Typography, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FirstPageIcon    from '@mui/icons-material/FirstPage';
import LastPageIcon     from '@mui/icons-material/LastPage';

/**
 * Paginador reutilizable para tablas.
 * Props: rows (array), page, setPage, pageSize, setPageSize
 * Devuelve: pagedRows = rows.slice(...)
 */
export function useTablePager(rows, defaultPageSize = 10) {
  const [page,     setPage]     = React.useState(0);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  React.useEffect(() => { setPage(0); }, [rows.length]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows  = rows.slice(page * pageSize, (page + 1) * pageSize);
  return { page, setPage, pageSize, setPageSize, totalPages, pagedRows };
}

export default function TablePager({ total, page, setPage, pageSize, setPageSize, sizes = [10, 25, 50] }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, total);

  return (
    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} px={2} py={1}
      sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
        Filas por página:
      </Typography>
      <Select size="small" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
        sx={{ fontSize: 12, height: 28 }}>
        {sizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mx: 1, whiteSpace: 'nowrap' }}>
        {from}–{to} de {total}
      </Typography>
      <Tooltip title="Primera página"><span>
        <IconButton size="small" onClick={() => setPage(0)} disabled={page === 0}><FirstPageIcon fontSize="small" /></IconButton>
      </span></Tooltip>
      <Tooltip title="Anterior"><span>
        <IconButton size="small" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeftIcon fontSize="small" /></IconButton>
      </span></Tooltip>
      <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'center' }}>
        {page + 1} / {totalPages}
      </Typography>
      <Tooltip title="Siguiente"><span>
        <IconButton size="small" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRightIcon fontSize="small" /></IconButton>
      </span></Tooltip>
      <Tooltip title="Última página"><span>
        <IconButton size="small" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><LastPageIcon fontSize="small" /></IconButton>
      </span></Tooltip>
    </Stack>
  );
}
