import React, { useState, useEffect, useRef } from 'react';
import {
  Box, TextField, MenuItem, InputAdornment, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const NIVELES = ['', 'Primer Semestre', 'Segundo Semestre', 'Tercer Semestre',
  'Cuarto Semestre', 'Quinto Semestre', 'Sexto Semestre', 'General'];

const DEBOUNCE_MS = 400;

export default function SearchBar({ categorias = [], onSearch, loading }) {
  const [busqueda, setBusqueda]         = useState('');
  const [categoriaId, setCategoriaId]   = useState('');
  const [nivelEducativo, setNivel]      = useState('');
  const debounceRef = useRef(null);

  const fireSearch = (b, c, n) =>
    onSearch({
      busqueda:       b || undefined,
      categoriaId:    c || undefined,
      nivelEducativo: n || undefined,
    });

  // Debounce solo en cambio de texto
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fireSearch(busqueda, categoriaId, nivelEducativo), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [busqueda]);

  // Búsqueda inmediata al cambiar select
  const handleCategoriaChange = (val) => { setCategoriaId(val); fireSearch(busqueda, val, nivelEducativo); };
  const handleNivelChange     = (val) => { setNivel(val);       fireSearch(busqueda, categoriaId, val); };

  const handleClear = () => {
    clearTimeout(debounceRef.current);
    setBusqueda(''); setCategoriaId(''); setNivel('');
    onSearch({});
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      fireSearch(busqueda, categoriaId, nivelEducativo);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField
        placeholder="Buscar por título, autor o ISBN..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        onKeyDown={handleKey}
        size="small"
        sx={{ minWidth: 280, flex: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ),
          endAdornment: busqueda ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setBusqueda('')}><ClearIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      <TextField
        select size="small" label="Categoría" value={categoriaId}
        onChange={e => handleCategoriaChange(e.target.value)}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">Todas</MenuItem>
        {categorias
          .filter(c => !(c.orden >= 1 && c.orden <= 6))
          .map(c => (
            <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
          ))}
      </TextField>

      <TextField
        select size="small" label="Nivel" value={nivelEducativo}
        onChange={e => handleNivelChange(e.target.value)}
        sx={{ minWidth: 160 }}
      >
        {NIVELES.map(n => <MenuItem key={n} value={n}>{n || 'Todos'}</MenuItem>)}
      </TextField>

      <IconButton onClick={handleClear} disabled={loading} sx={{ borderRadius: 2 }}>
        <ClearIcon />
      </IconButton>
    </Box>
  );
}
