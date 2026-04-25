import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES = {
  fullName: ['nombre', 'name', 'nombre completo', 'full name', 'alumno', 'estudiante', 'destinatario'],
  email:    ['email', 'correo', 'correo electronico', 'correo electrónico', 'e-mail', 'mail'],
  username: ['usuario', 'username', 'user', 'cuenta', 'no. control', 'numero de control', 'matricula', 'matrícula'],
  password: ['contrasena', 'contraseña', 'password', 'clave', 'pass', 'nip'],
};

function normalize(key) {
  return key.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const STANDARD_KEYS = Object.values(COLUMN_ALIASES).flat().map(normalize);

function mapRow(raw, i) {
  const r = {};
  for (const [k, v] of Object.entries(raw))
    r[normalize(k)] = typeof v === 'string' ? v.trim() : String(v ?? '').trim();

  const find = (aliases) => aliases.map(normalize).map(a => r[a]).find(v => v) || '';

  // Capturar columnas extra que no son estándar → extraData
  const extraData = {};
  for (const [k, v] of Object.entries(raw)) {
    const normKey = normalize(k);
    if (!STANDARD_KEYS.includes(normKey) && v) {
      const varKey = k.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      if (varKey) extraData[varKey] = typeof v === 'string' ? v.trim() : String(v ?? '').trim();
    }
  }

  return {
    id:       i,
    fullName: find(COLUMN_ALIASES.fullName),
    email:    find(COLUMN_ALIASES.email),
    username: find(COLUMN_ALIASES.username),
    password: find(COLUMN_ALIASES.password),
    ...(Object.keys(extraData).length > 0 ? { extraData } : {}),
  };
}

function buildResult(rows) {
  const errors = rows
    .filter(r => !r.fullName || !r.email || !r.username || !r.password)
    .map(r => `Fila ${r.id + 2}: datos incompletos`);
  return { rows: rows.filter(r => r.fullName && r.email && r.username && r.password), errors };
}

function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => resolve(buildResult(data.map(mapRow))),
      error: reject,
    });
  });
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(buildResult(data.map(mapRow)));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseRecipientFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') return parseCsvFile(file);
  if (ext === 'xlsx' || ext === 'xls') return parseExcelFile(file);
  return Promise.reject(new Error('Formato no soportado. Usa .csv, .xlsx o .xls'));
}

export { parseCsvFile };
