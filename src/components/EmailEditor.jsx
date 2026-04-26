import React, { useRef, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  Box, TextField, ToggleButton, ToggleButtonGroup, Typography,
  Paper, Chip, Stack, Tooltip, Divider, Alert, IconButton, CircularProgress,
  Select, MenuItem,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { mediaApi } from '../api/pandoraApi';

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

function ensureHtml(content) {
  if (!content) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return plainToHtml(content);
}

function renderPreview(body, isRawHtml, customVars) {
  const html = isRawHtml ? body.replace(/\n/g, '<br>') : body;
  let result = html;
  Object.entries(FIXED_PREVIEW).forEach(([token, val]) => {
    result = result.replaceAll(token, `<strong style="color:#1a237e">${val}</strong>`);
  });
  customVars.forEach(name => {
    result = result.replaceAll(
      `{{${name}}}`,
      `<strong style="color:#6a1b9a">[ ${name} ]</strong>`
    );
  });
  return result;
}

// Extensión personalizada para tamaño de fuente
const FONT_FAMILIES = [
  { label: 'Predeterminada', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
];

const FONT_SIZES = ['10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

function RichToolbar({ editor }) {
  const colorRef = useRef(null);
  if (!editor) return null;

  const currentFamily = editor.getAttributes('textStyle').fontFamily || '';
  const currentSize   = editor.getAttributes('textStyle').fontSize   || '';

  return (
    <Box sx={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.25,
      px: 1, py: 0.5,
      borderBottom: '1px solid', borderColor: 'divider',
      bgcolor: 'grey.50',
    }}>
      <Tooltip title="Negrita (Ctrl+B)">
        <IconButton size="small" onClick={() => editor.chain().focus().toggleBold().run()}
          color={editor.isActive('bold') ? 'primary' : 'default'}>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Cursiva (Ctrl+I)">
        <IconButton size="small" onClick={() => editor.chain().focus().toggleItalic().run()}
          color={editor.isActive('italic') ? 'primary' : 'default'}>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Subrayado (Ctrl+U)">
        <IconButton size="small" onClick={() => editor.chain().focus().toggleUnderline().run()}
          color={editor.isActive('underline') ? 'primary' : 'default'}>
          <FormatUnderlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Tachado">
        <IconButton size="small" onClick={() => editor.chain().focus().toggleStrike().run()}
          color={editor.isActive('strike') ? 'primary' : 'default'}>
          <FormatStrikethroughIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Select
        size="small"
        value={currentFamily}
        onChange={e => {
          const val = e.target.value;
          if (!val) editor.chain().focus().unsetFontFamily().run();
          else editor.chain().focus().setFontFamily(val).run();
        }}
        displayEmpty
        sx={{ fontSize: 12, height: 28, minWidth: 120, '.MuiSelect-select': { py: 0.25, px: 1 } }}
        renderValue={val => FONT_FAMILIES.find(f => f.value === val)?.label || 'Fuente'}
      >
        {FONT_FAMILIES.map(f => (
          <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value || 'inherit', fontSize: 13 }}>
            {f.label}
          </MenuItem>
        ))}
      </Select>

      <Select
        size="small"
        value={currentSize}
        onChange={e => {
          const val = e.target.value;
          if (!val) editor.chain().focus().unsetFontSize().run();
          else editor.chain().focus().setFontSize(val).run();
        }}
        displayEmpty
        sx={{ fontSize: 12, height: 28, minWidth: 80, '.MuiSelect-select': { py: 0.25, px: 1 } }}
        renderValue={val => val ? val.replace('px', '') : 'Tamaño'}
      >
        <MenuItem value="" sx={{ fontSize: 13 }}>Predeterminado</MenuItem>
        {FONT_SIZES.map(s => (
          <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s.replace('px', '')}</MenuItem>
        ))}
      </Select>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Color de texto">
        <IconButton size="small" onClick={() => colorRef.current?.click()} sx={{ position: 'relative' }}>
          <FormatColorTextIcon fontSize="small" />
          <input
            ref={colorRef}
            type="color"
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
            onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Alinear izquierda">
        <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('left').run()}
          color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'}>
          <FormatAlignLeftIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Centrar">
        <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('center').run()}
          color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'}>
          <FormatAlignCenterIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Alinear derecha">
        <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('right').run()}
          color={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'default'}>
          <FormatAlignRightIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Justificar">
        <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          color={editor.isActive({ textAlign: 'justify' }) ? 'primary' : 'default'}>
          <FormatAlignJustifyIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Lista con viñetas">
        <IconButton size="small" onClick={() => editor.chain().focus().toggleBulletList().run()}
          color={editor.isActive('bulletList') ? 'primary' : 'default'}>
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Lista numerada">
        <IconButton size="small" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          color={editor.isActive('orderedList') ? 'primary' : 'default'}>
          <FormatListNumberedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function EmailEditor({
  subject, body, onSubjectChange, onBodyChange,
  inputMode: controlledInputMode,
  onInputModeChange,
  variables = [],
}) {
  const [viewMode, setViewMode]             = useState('edit');
  const [internalInputMode, setInternalInputMode] = useState('plain');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError]         = useState('');
  const fileInputRef   = useRef(null);
  const bodyRef        = useRef(null);
  const isInternalEdit = useRef(false);

  const inputMode = controlledInputMode ?? internalInputMode;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    content: ensureHtml(body),
    onUpdate: ({ editor }) => {
      isInternalEdit.current = true;
      onBodyChange(editor.getHTML());
    },
  });

  // Sincroniza el contenido externo (ej. al abrir otra plantilla) en TipTap
  useEffect(() => {
    if (!editor || inputMode !== 'plain') return;
    if (isInternalEdit.current) { isInternalEdit.current = false; return; }
    const html = ensureHtml(body);
    if (html !== editor.getHTML()) {
      editor.commands.setContent(html, false);
    }
    if (html !== body) onBodyChange(html);
  }, [body, editor, inputMode]);

  const insertVariable = (token) => {
    if (inputMode === 'plain' && editor) {
      editor.chain().focus().insertContent(token).run();
    } else {
      const el = bodyRef.current?.querySelector('textarea');
      if (el) {
        const start = el.selectionStart ?? body.length;
        const end   = el.selectionEnd   ?? body.length;
        onBodyChange(body.slice(0, start) + token + body.slice(end));
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + token.length;
          el.focus();
        }, 0);
      } else {
        onBodyChange(body + token);
      }
    }
  };

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
      if (inputMode === 'plain' && editor) {
        editor.chain().focus().insertContent(tag).run();
      } else {
        onBodyChange(body + tag);
      }
    } catch (err) {
      setImageError(err.response?.data || 'Error al subir la imagen.');
    } finally {
      setUploadingImage(false);
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
              <EditIcon fontSize="small" sx={{ mr: 0.5 }} />Editor
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

          <Tooltip title="Subir e insertar imagen (jpg, png, gif, webp — máx 5 MB)">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1, px: 1 }}
              >
                {uploadingImage ? <CircularProgress size={16} /> : <ImageIcon fontSize="small" />}
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
        inputMode === 'plain' ? (
          <Paper variant="outlined" sx={{
            overflow: 'hidden',
            '& .ProseMirror': {
              minHeight: 280,
              maxHeight: 500,
              overflowY: 'auto',
              p: 2,
              outline: 'none',
              fontSize: 14,
              lineHeight: 1.7,
              fontFamily: 'inherit',
              '& p': { margin: '0 0 8px 0' },
              '& ul, & ol': { paddingLeft: '1.5rem' },
              '& img': { maxWidth: '100%', height: 'auto' },
              '& h1, & h2, & h3': { margin: '0 0 8px 0' },
            },
          }}>
            <RichToolbar editor={editor} />
            <EditorContent editor={editor} />
          </Paper>
        ) : (
          <Box ref={bodyRef}>
            <TextField
              fullWidth
              multiline
              minRows={14}
              maxRows={28}
              label="Cuerpo del correo (HTML)"
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
              placeholder={`<p>Estimado/a <strong>{{nombre}}</strong>,</p>\n<p>Tus credenciales: {{usuario}} / {{contrasena}}</p>`}
            />
          </Box>
        )
      ) : (
        <Paper variant="outlined" sx={{ p: 3, minHeight: 300, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Vista previa con datos de ejemplo
            {variables.length > 0 && ' — las variables personalizadas aparecen en morado'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <div
            style={{ lineHeight: 1.7, fontSize: 14 }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                renderPreview(body, inputMode === 'html', variables),
                { USE_PROFILES: { html: true } }
              ),
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
