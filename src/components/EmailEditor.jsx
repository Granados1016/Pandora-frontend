import React, { useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Box, TextField, ToggleButton, ToggleButtonGroup, Typography,
  Paper, Chip, Stack, Tooltip, Divider, Alert, IconButton, CircularProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import { mediaApi } from '../api/pandoraApi';

// Variables fijas — siempre disponibles en toda plantilla
const FIXED_VARIABLES = [
  { token: '{{nombre}}',     label: 'Nombre',     color: 'primary' },
  { token: '{{usuario}}',    label: 'Usuario',    color: 'secondary' },
  { token: '{{contrasena}}', label: 'Contraseña', color: 'error' },
  { token: '{{programa}}',   label: 'Programa',   color: 'success' },
];

const FIXED_PREVIEW = {
  '{{nombre}}':     'María García López',
  '{{usuario}}':    'mgarcia2024',
  '{{contrasena}}': 'Acc3ss#iMET',
  '{{programa}}':   'Licenciatura en Tecnologías de la Información',
};

// Convierte texto plano a HTML seguro para correo
export function plainToHtml(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n{2,}/);
  return paragraphs
    .map(p => `<p style="margin:0 0 12px 0">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function renderPreview(body, isPlain, customVars) {
  const html = isPlain ? plainToHtml(body) : body.replace(/\n/g, '<br>');
  let result = html;

  // Sustituir variables fijas
  Object.entries(FIXED_PREVIEW).forEach(([token, val]) => {
    result = result.replaceAll(token, `<strong style="color:#1a237e">${val}</strong>`);
  });

  // Sustituir variables dinámicas con valor de ejemplo
  customVars.forEach(name => {
    result = result.replaceAll(
      `{{${name}}}`,
      `<strong style="color:#6a1b9a">[ ${name} ]</strong>`
    );
  });

  return result;
}

/**
 * Props:
 *   subject, body, onSubjectChange, onBodyChange  — contenido controlado
 *   inputMode        — 'plain' | 'html'; si se omite usa estado interno
 *   onInputModeChange — callback al cambiar modo
 *   variables        — string[] de nombres de variables dinámicas de la plantilla
 */
export default function EmailEditor({
  subject, body, onSubjectChange, onBodyChange,
  inputMode: controlledInputMode,
  onInputModeChange,
  variables = [],
}) {
  const [viewMode, setViewMode]           = useState('edit');
  const [internalInputMode, setInternalInputMode] = useState('plain');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError]       = useState('');
  const fileInputRef = useRef(null);
  const bodyRef      = useRef(null);

  const inputMode = controlledInputMode ?? internalInputMode;

  const insertAtCursor = (text) => {
    const el = bodyRef.current?.querySelector('textarea');
    if (el) {
      const start = el.selectionStart ?? body.length;
      const end   = el.selectionEnd   ?? body.length;
      const next  = body.slice(0, start) + text + body.slice(end);
      onBodyChange(next);
      // Restaurar posición del cursor después del render
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + text.length;
        el.focus();
      }, 0);
    } else {
      onBodyChange(body + text);
    }
  };

  const insertVariable = (token) => insertAtCursor(token);

  const handleModeSwitch = (_, val) => {
    if (!val) return;
    if (controlledInputMode === undefined) setInternalInputMode(val);
    onInputModeChange?.(val);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    setUploadingImage(true);
    try {
      const { data } = await mediaApi.uploadImage(file);
      const tag = `<img src="${data.url}" alt="imagen" style="max-width:100%;height:auto;" />`;
      insertAtCursor(tag);
    } catch (err) {
      setImageError(err.response?.data || 'Error al subir la imagen.');
    } finally {
      setUploadingImage(false);
      // Limpiar input para permitir re-subir el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="subtitle1" fontWeight={600}>Contenido del Correo</Typography>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup value={inputMode} exclusive onChange={handleModeSwitch} size="small">
            <ToggleButton value="plain">
              <EditIcon fontSize="small" sx={{ mr: 0.5 }} />Texto
            </ToggleButton>
            <ToggleButton value="html">
              <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />HTML
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
            <ToggleButton value="edit"><EditIcon fontSize="small" sx={{ mr: 0.5 }} />Editar</ToggleButton>
            <ToggleButton value="preview"><VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />Vista Previa</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {inputMode === 'plain' && (
        <Alert severity="info" sx={{ mb: 2 }} icon={false}>
          Modo <strong>Texto Plano</strong> — los saltos de línea y párrafos se conservan en el correo.
        </Alert>
      )}
      {inputMode === 'html' && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={false}>
          Modo <strong>HTML</strong> — escribe etiquetas directamente. Las imágenes se insertan con el botón{' '}
          <ImageIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} />.
        </Alert>
      )}

      <TextField
        fullWidth
        label="Asunto del correo"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
        sx={{ mb: 2 }}
        placeholder="Ej: Acceso al Sistema Institucional — iMET"
      />

      {/* Variables + botón de imagen */}
      <Box sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Tooltip title="Haz clic para insertar donde está el cursor">
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Tooltip>
          <Typography variant="caption" color="text.secondary">Variables fijas:</Typography>
          {FIXED_VARIABLES.map(({ token, label, color }) => (
            <Chip
              key={token}
              label={label}
              size="small"
              color={color}
              variant="outlined"
              clickable
              onClick={() => insertVariable(token)}
              sx={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          ))}

          {variables.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Typography variant="caption" color="text.secondary">Personalizadas:</Typography>
              {variables.map(name => (
                <Chip
                  key={name}
                  label={name}
                  size="small"
                  color="secondary"
                  clickable
                  onClick={() => insertVariable(`{{${name}}}`)}
                  sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f3e5f5' }}
                />
              ))}
            </>
          )}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Botón insertar imagen */}
          <Tooltip title="Subir e insertar imagen (jpg, png, gif, webp — máx 5 MB)">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1, px: 1 }}
              >
                {uploadingImage
                  ? <CircularProgress size={16} />
                  : <ImageIcon fontSize="small" />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {uploadingImage ? 'Subiendo…' : 'Imagen'}
                </Typography>
              </IconButton>
            </span>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            hidden
            onChange={handleImageUpload}
          />
        </Stack>

        {imageError && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setImageError('')}>
            {imageError}
          </Alert>
        )}
      </Box>

      {viewMode === 'edit' ? (
        <Box ref={bodyRef}>
          <TextField
            fullWidth
            multiline
            minRows={14}
            maxRows={28}
            label={inputMode === 'plain' ? 'Cuerpo del correo' : 'Cuerpo del correo (HTML)'}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            inputProps={{ style: { fontFamily: inputMode === 'html' ? 'monospace' : 'inherit', fontSize: 13 } }}
            placeholder={inputMode === 'plain'
              ? `Estimado/a {{nombre}},\n\nTe informamos que tus credenciales de acceso son:\n\nUsuario: {{usuario}}\nContraseña: {{contrasena}}\nPrograma: {{programa}}\n\nSaludos,\nCoordinación de TI — iMET`
              : `<p>Estimado/a <strong>{{nombre}}</strong>,</p>\n<p>Tus credenciales: {{usuario}} / {{contrasena}}</p>`
            }
          />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, minHeight: 300, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Vista previa con datos de ejemplo
            {variables.length > 0 && ' — las variables personalizadas aparecen en morado'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <div
            style={{ lineHeight: 1.7, fontSize: 14 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderPreview(body, inputMode === 'plain', variables), { USE_PROFILES: { html: true } }) }}
          />
        </Paper>
      )}
    </Box>
  );
}
