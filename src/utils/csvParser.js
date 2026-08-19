import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES = {
  fullName: ['nombre', 'name', 'nombre completo', 'full name', 'alumno', 'estudiante', 'destinatario'],
  email:    ['email', 'correo', 'correo electronico', 'correo electrónico', 'e-mail', 'mail'],
  username: ['usuario', 'username', 'user', 'cuenta', 'no. control', 'numero de control', 'matricula', 'matrícula'],
  password: ['contrasena', 'contraseña', 'password', 'clave', 'pass', 'nip'],
  status:   ['estatus', 'status', 'estado', 'estatus de envio', 'estatus de envío', 'credencial enviada'],
};

function normalize(key) {
  return key.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const STANDARD_KEYS = Object.values(COLUMN_ALIASES).flat().map(normalize);

// Valores de la celda "Estatus" que indican que ya se enviaron las credenciales
// (se compara normalizado: sin acentos, minúsculas y sin espacios extra, así que
// "Listo", "LISTO", "listo " o "Enviado" caen todos en el mismo bucket).
const ALREADY_SENT_VALUES = new Set(
  [
    'listo', 'lista', 'listos', 'listas',
    'enviado', 'enviada', 'enviados', 'enviadas', 'ya enviado', 'ya enviada',
    'completado', 'completada', 'completo', 'completa',
    'terminado', 'terminada',
    'hecho', 'hecha',
    'si', 'sí', 'ok', 'done', 'sent', 'completed',
  ].map(normalize)
);

function isAlreadySent(statusValue) {
  if (!statusValue) return false;
  return ALREADY_SENT_VALUES.has(normalize(statusValue));
}

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
    _status:  find(COLUMN_ALIASES.status),
    ...(Object.keys(extraData).length > 0 ? { extraData } : {}),
  };
}

function buildResult(rows) {
  // Filas cuya columna de estatus ya dice "Listo/Enviado" (y variantes) → no se
  // vuelven a enviar credenciales, se excluyen del envío desde el parseo.
  const alreadySent = rows.filter(r => isAlreadySent(r._status));
  const pending      = rows.filter(r => !isAlreadySent(r._status));

  const errors = pending
    .filter(r => !r.fullName || !r.email || !r.username || !r.password)
    .map(r => `Fila ${r.id + 2}: datos incompletos`);

  return {
    rows: pending
      .filter(r => r.fullName && r.email && r.username && r.password)
      .map(({ _status, ...r }) => r), // no mandamos el estatus crudo al backend
    errors,
    skippedSent: alreadySent.length,
  };
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
