/**
 * printPdf — Genera una ventana de impresión estilizada.
 * Compatible con todos los navegadores; el usuario puede elegir "Guardar como PDF".
 *
 * @param {string} title   — Título del documento
 * @param {string} html    — Contenido HTML ya renderizado
 * @param {object} [opts]
 * @param {string} [opts.subtitle]   — Subtítulo opcional bajo el título
 * @param {string} [opts.footer]     — Texto en el pie de página
 */
export function printPdf(title, html, opts = {}) {
  const { subtitle = '', footer = 'Pandora — Sistema de Gestión iMET' } = opts;

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Inter, Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      padding: 0;
    }
    .print-header {
      background: #1a237e;
      color: #fff;
      padding: 18px 28px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .print-header h1 { font-size: 16pt; font-weight: 700; }
    .print-header .subtitle { font-size: 9pt; opacity: .8; margin-top: 4px; }
    .print-header .date { font-size: 9pt; text-align: right; opacity: .85; }
    .print-body {
      padding: 24px 28px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10pt;
    }
    th {
      background: #1a237e;
      color: #fff;
      padding: 7px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
    }
    td {
      padding: 6px 10px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f5f6fa; }
    .chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8.5pt;
      font-weight: 600;
    }
    .chip-success  { background: #e8f5e9; color: #1b5e20; }
    .chip-error    { background: #ffebee; color: #b71c1c; }
    .chip-warning  { background: #fff3e0; color: #e65100; }
    .chip-default  { background: #e8eaf6; color: #283593; }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      margin: 12px 0;
    }
    .detail-item label {
      font-size: 8.5pt;
      font-weight: 600;
      color: #5c5c8a;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .detail-item p {
      font-size: 10.5pt;
      margin-top: 2px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a237e;
      border-bottom: 2px solid #1a237e;
      padding-bottom: 4px;
      margin: 20px 0 10px;
    }
    .print-footer {
      position: fixed;
      bottom: 0;
      left: 0; right: 0;
      background: #f5f6fa;
      border-top: 1px solid #e0e0e0;
      padding: 6px 28px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #777;
    }
    @page { margin: 10mm 10mm 18mm; }
    @media print {
      .print-footer { position: fixed; }
    }
  `;

  const now = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Permitir ventanas emergentes para exportar PDF.'); return; }

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="date">${now}</div>
  </div>
  <div class="print-body">${html}</div>
  <div class="print-footer">
    <span>${footer}</span>
    <span>Generado el ${now}</span>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>`);
  win.document.close();
}

/**
 * Genera HTML de tabla a partir de un array de objetos.
 * @param {string[]} headers  — Nombres de columnas
 * @param {string[]} keys     — Claves en cada objeto
 * @param {object[]} rows     — Datos
 * @param {function} [renderCell] — (key, value, row) => string HTML opcional
 */
export function buildTableHtml(headers, keys, rows, renderCell = null) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(row => {
    const tds = keys.map(k => {
      const val = row[k] ?? '—';
      const html = renderCell ? renderCell(k, val, row) : String(val);
      return `<td>${html}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}
