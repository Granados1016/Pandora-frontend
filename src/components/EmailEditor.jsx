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
  return escaped.split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 12px 0">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function ensureHtml(content) {
  if (!content) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return plainToHtml(content);
}

function renderPreview(body, customVars) {
  let result = body;
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

const FONT_FAMILIES = [
  { label: 'Predeterminada', value: '' },
  { label: 'Arial',          value: 'Arial, sans-serif' },
  { label: 'Times New Roman',value: 'Times New Roman, serif' },
  { label: 'Georgia',        value: 'Georgia, serif' },
  { label: 'Verdana',        value: 'Verdana, sans-serif' },
  { label: 'Courier New',    value: 'Courier New, monospace' },
];

const FONT_SIZES = ['10px','11px','12px','13px','14px','16px','18px','20px','24px','28px','32px'];

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

      <Select size="small" value={currentFamily} displayEmpty
        onChange={e => {
          const v = e.target.value;
          v ? editor.chain().focus().setFontFamily(v).run()
            : editor.chain().focus().unsetFontFamily().run();
        }}
        sx={{ fontSize: 12, height: 28, minWidth: 120, '.MuiSelect-select': { py: 0.25, px: 1 } }}
        renderValue={v => FONT_FAMILIES.find(f => f.value === v)?.label || 'Fuente'}
      >
        {FONT_FAMILIES.map(f => (
          <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value || 'inherit', fontSize: 13 }}>
            {f.label}
          </MenuItem>
        ))}
      </Select>

      <Select size="small" value={currentSize} displayEmpty
        onChange={e => {
          const v = e.target.value;
          v ? editor.chain().focus().setFontSize(v).run()
            : editor.chain().focus().unsetFontSize().run();
        }}
        sx={{ fontSize: 12, height: 28, minWidth: 80, '.MuiSelect-select': { py: 0.25, px: 1 } }}
        renderValue={v => v ? v.replace('px', '') : 'Tamaño'}
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
          <input ref={colorRef} type="color"
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
            onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Izquierda">
        <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('left').run()}
          color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'}>
          <FormatAlignLeftIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Centro">
        <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('center').run()}
          color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'}>
          <FormatAlignCenterIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Derecha">
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
  variables = [],
}) {
  const [viewMode, setViewMode]           = useState('edit');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError]       = useState('');
  const fileInputRef   = useRef(null);
  const isInternalEdit = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
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

  // Sincroniza cuando se abre una plantilla diferente
  useEffect(() => {
    if (!editor) return;
    if (isInternalEdit.current) { isInternalEdit.current = false; return; }
    const html = ensureHtml(body);
    if (html !== editor.getHTML()) editor.commands.setContent(html, false);
  }, [body, editor]);

  const insertVariable = (token) => {
    editor?.chain().focus().insertContent(token).run();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    setUploadingImage(true);
    try {
      const { data } = await mediaApi.uploadImage(file);
      editor?.chain().focus().insertContent(
        `<img src="${data.url}" alt="imagen" style="max-width:100%;height:auto;" />`
      ).run();
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
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
          <ToggleButton value="edit"><EditIcon fontSize="small" sx={{ mr: 0.5 }} />Editar</ToggleButton>
          <ToggleButton value="preview"><VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />Vista Previa</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

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
            <Chip key={token} label={label} size="small" color={color} variant="outlined" clickable
              onClick={() => insertVariable(token)}
              sx={{ fontFamily: 'monospace', fontSize: 12 }} />
          ))}

          {variables.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Typography variant="caption" color="text.secondary">Personalizadas:</Typography>
              {variables.map(name => (
                <Chip key={name} label={name} size="small" color="secondary" clickable
                  onClick={() => insertVariable(`{{${name}}}`)}
                  sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f3e5f5' }} />
              ))}
            </>
          )}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="Subir e insertar imagen (jpg, png, gif, webp — máx 5 MB)">
            <span>
              <IconButton size="small" color="primary" disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1, px: 1 }}>
                {uploadingImage ? <CircularProgress size={16} /> : <ImageIcon fontSize="small" />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {uploadingImage ? 'Subiendo…' : 'Imagen'}
                </Typography>
              </IconButton>
            </span>
          </Tooltip>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" hidden
            onChange={handleImageUpload} />
        </Stack>

        {imageError && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setImageError('')}>{imageError}</Alert>
        )}
      </Box>

      {viewMode === 'edit' ? (
        <Paper variant="outlined" sx={{
          overflow: 'hidden',
          '& .ProseMirror': {
            minHeight: 280, maxHeight: 500, overflowY: 'auto',
            p: 2, outline: 'none', fontSize: 14, lineHeight: 1.7,
            '& p': { margin: '0 0 8px 0' },
            '& ul, & ol': { paddingLeft: '1.5rem' },
            '& img': { maxWidth: '100%', height: 'auto' },
          },
        }}>
          <RichToolbar editor={editor} />
          <EditorContent editor={editor} />
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, minHeight: 300, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Vista previa con datos de ejemplo
            {variables.length > 0 && ' — las variables personalizadas aparecen en morado'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <div style={{ lineHeight: 1.7, fontSize: 14 }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderPreview(body, variables), { USE_PROFILES: { html: true } }),
            }} />
        </Paper>
      )}
    </Box>
  );
}
