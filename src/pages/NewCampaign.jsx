import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, Button, Card, CardContent, TextField,
  ToggleButton, ToggleButtonGroup, Stepper, Step, StepLabel,
  Alert, CircularProgress, Stack, Divider, Chip,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArticleIcon from '@mui/icons-material/Article';
import EmailEditor, { plainToHtml } from '../components/EmailEditor';
import RecipientTable from '../components/RecipientTable';
import { campaignApi, templateApi } from '../api/pandoraApi';
import { parseRecipientFile } from '../utils/csvParser';
import { programLabel, PROGRAM_TYPE } from '../utils/statusHelpers';

const STEPS = ['Configuración', 'Destinatarios', 'Cuerpo del Correo', 'Confirmar y Enviar'];

const CREDENTIALS_TABLE = `<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Usuario:</td><td style="font-family:monospace;font-size:15px;color:#1a237e"><strong>{{usuario}}</strong></td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Contraseña:</td><td style="font-family:monospace;font-size:15px;color:#1a237e"><strong>{{contrasena}}</strong></td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Programa:</td><td><strong>{{programa}}</strong></td></tr>
</table>`;

const DEFAULT_BODY_LIC = `<p>Estimado/a <strong>{{nombre}}</strong>,</p>
<p>Te informamos que tus credenciales de acceso al sistema institucional han sido generadas.</p>
${CREDENTIALS_TABLE}
<p>Por favor cambia tu contraseña en tu primer inicio de sesión.</p>
<p>Saludos,<br/><strong>Coordinación de TI</strong></p>`;

const DEFAULT_BODY_POS = `<p>Estimado/a <strong>{{nombre}}</strong>,</p>
<p>Bienvenido al programa de Posgrado. A continuación tus credenciales de acceso:</p>
${CREDENTIALS_TABLE}
<p>Cualquier duda, contacta a la Coordinación de TI.</p>
<p>Saludos,<br/><strong>Coordinación de TI</strong></p>`;

const DEFAULT_BODY_PREP = `<p>Estimado/a <strong>{{nombre}}</strong>,</p>
<p>Te informamos que tus credenciales de acceso al sistema institucional de Preparatoria han sido generadas.</p>
${CREDENTIALS_TABLE}
<p>Por favor cambia tu contraseña en tu primer inicio de sesión.</p>
<p>Saludos,<br/><strong>Coordinación de TI</strong></p>`;

const DEFAULT_BODY_NOTIF = `<p>Estimado/a <strong>{{nombre}}</strong>,</p>
<p>Te enviamos el presente mensaje para informarte lo siguiente:</p>
<p>[Escribe aquí el contenido de la notificación]</p>
<p>Saludos,<br/><strong>Coordinación de TI</strong></p>`;

export default function NewCampaign() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep]             = useState(0);
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError]   = useState('');
  const [csvErrors, setCsvErrors]   = useState([]);
  const [skippedSent, setSkippedSent] = useState(0);
  const [templates, setTemplates]   = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [editorMode, setEditorMode]             = useState('plain');
  const [templateVariables, setTemplateVariables] = useState([]);
  const [campaignId, setCampaignId] = useState(null);
  const [polling, setPolling]       = useState(false);

  const [form, setForm] = useState({
    name: '',
    programType: 1,
    subject: 'Acceso al Sistema Institucional',
    body: DEFAULT_BODY_LIC,
    recipients: [],
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    templateApi.getAll().then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  // ─── Template ──────────────────────────────────────────────────────────────
  const handleTemplateSelect = (e) => {
    const id = e.target.value;
    setSelectedTemplate(id);
    if (!id) return;
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      set('subject', tpl.subject);
      set('body', tpl.body);
      set('templateId', tpl.id);
      setEditorMode(tpl.isPlainText ? 'plain' : 'html');
      setTemplateVariables(tpl.variables ?? []);
    }
  };

  const handleProgramChange = (_, val) => {
    if (!val) return;
    const bodyMap = {
      [PROGRAM_TYPE.LICENCIATURA]:   DEFAULT_BODY_LIC,
      [PROGRAM_TYPE.POSGRADO]:       DEFAULT_BODY_POS,
      [PROGRAM_TYPE.PREPARATORIA]:   DEFAULT_BODY_PREP,
      [PROGRAM_TYPE.NOTIFICACIONES]: DEFAULT_BODY_NOTIF,
    };
    const subjectMap = {
      [PROGRAM_TYPE.LICENCIATURA]:   'Acceso al Sistema Institucional — Licenciatura',
      [PROGRAM_TYPE.POSGRADO]:       'Credenciales de Acceso — Posgrado',
      [PROGRAM_TYPE.PREPARATORIA]:   'Acceso al Sistema Institucional — Preparatoria',
      [PROGRAM_TYPE.NOTIFICACIONES]: 'Notificación Institucional',
    };
    setForm(f => ({ ...f, programType: val, body: bodyMap[val], subject: subjectMap[val] }));
  };

  // ─── Carga del archivo ─────────────────────────────────────────────────────
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { rows, errors, skippedSent } = await parseRecipientFile(file);
      set('recipients', rows);
      setCsvErrors(errors);
      setSkippedSent(skippedSent || 0);
    } catch (err) {
      setCsvErrors([err.message || 'Error al leer el archivo.']);
      setSkippedSent(0);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeRecipient = (index) =>
    set('recipients', form.recipients.filter((_, i) => i !== index));

  // ─── Navegación ───────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.recipients.length > 0;
    if (step === 2) return form.subject.trim().length > 0 && form.body.trim().length > 0;
    return true;
  };

  // ─── Polling: actualiza contadores mientras el envío corre en background ──
  useEffect(() => {
    if (!polling || !campaignId) return;
    const interval = setInterval(async () => {
      try {
        const { data: c } = await campaignApi.getById(campaignId);
        setSendResult({ total: c.totalRecipients, sent: c.sentCount, failed: c.failedCount, status: c.status });
        if (c.status === 'Completado' || c.status === 'Completado con errores') {
          setPolling(false);
        }
      } catch { setPolling(false); }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, campaignId]);

  // ─── Enviar ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setSending(true);
    try {
      const bodyHtml = editorMode === 'plain' ? plainToHtml(form.body) : form.body;
      const payload = {
        name:        form.name,
        subject:     form.subject,
        body:        bodyHtml,
        programType: form.programType,
        recipients:  form.recipients.map(r => ({
          fullName:  r.fullName,
          email:     r.email,
          username:  r.username,
          password:  r.password,
          extraData: r.extraData ?? null,
        })),
      };
      const { data: campaign } = await campaignApi.create(payload);
      await campaignApi.send(campaign.id);
      setCampaignId(campaign.id);
      setSendResult({ total: form.recipients.length, sent: 0, failed: 0, status: 'Enviando' });
      setPolling(true);
      setStep(4);
    } catch (err) {
      setSendError('Error al enviar: ' + (err.response?.data || err.message));
    } finally {
      setSending(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4, maxWidth: 960, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" gap={2} mb={4}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>Volver</Button>
        <Typography variant="h4" fontWeight={800} color="primary.main">Nueva Campaña</Typography>
      </Stack>

      <Stepper activeStep={step > 3 ? 4 : step} sx={{ mb: 4 }}>
        {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {/* ── Paso 0: Configuración ─────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Configuración de Campaña</Typography>
            <TextField
              fullWidth label="Nombre de la campaña" value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Accesos Agosto 2024 — Licenciatura"
              sx={{ mb: 3 }}
            />
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Tipo de Programa</Typography>
            <ToggleButtonGroup
              value={form.programType} exclusive onChange={handleProgramChange}
              fullWidth sx={{ mb: 2 }}
            >
              <ToggleButton value={1} sx={{ py: 1.5, fontWeight: 600, fontSize: 13 }}>Licenciatura</ToggleButton>
              <ToggleButton value={2} sx={{ py: 1.5, fontWeight: 600, fontSize: 13 }}>Posgrado</ToggleButton>
              <ToggleButton value={3} sx={{ py: 1.5, fontWeight: 600, fontSize: 13 }}>Preparatoria</ToggleButton>
              <ToggleButton value={4} sx={{ py: 1.5, fontWeight: 600, fontSize: 13 }}>Notificaciones</ToggleButton>
            </ToggleButtonGroup>
            <Alert severity="info" sx={{ mt: 2 }}>
              Al seleccionar el programa se carga una plantilla base. Podrás editarla en el paso 3.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ── Paso 1: Destinatarios ─────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight={700}>Destinatarios</Typography>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Cargar archivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                hidden
                onChange={handleCsvUpload}
              />
            </Stack>

            <Alert severity="info" sx={{ mb: 2 }}>
              El archivo debe tener columnas: <strong>nombre, email, usuario, contraseña</strong>.
              Las columnas adicionales se capturan como variables dinámicas para el correo.
              Si agregas una columna <strong>Estatus</strong> y marcas una fila como <em>Listo</em> o <em>Enviado</em>
              (en cualquier combinación de mayúsculas/minúsculas), Pandora la omite automáticamente
              para no reenviar credenciales.
            </Alert>

            {csvErrors.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {csvErrors.slice(0, 3).join(' · ')}
                {csvErrors.length > 3 && ` · y ${csvErrors.length - 3} más`}
              </Alert>
            )}

            {skippedSent > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {skippedSent} destinatario{skippedSent !== 1 ? 's' : ''} omitido{skippedSent !== 1 ? 's' : ''} por
                estatus ya marcado como "Listo/Enviado" — no se le{skippedSent !== 1 ? 's' : ''} reenviarán credenciales.
              </Alert>
            )}

            {form.recipients.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Chip
                  label={`${form.recipients.length} destinatario${form.recipients.length !== 1 ? 's' : ''} cargado${form.recipients.length !== 1 ? 's' : ''}`}
                  color="success" size="small"
                />
              </Stack>
            )}

            <RecipientTable recipients={form.recipients} onRemove={removeRecipient} />
          </CardContent>
        </Card>
      )}

      {/* ── Paso 2: Cuerpo del correo ─────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardContent sx={{ p: 4 }}>
            {templates.length > 0 && (
              <Box mb={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="template-select-label">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <ArticleIcon fontSize="small" />
                      <span>Cargar desde plantilla guardada</span>
                    </Stack>
                  </InputLabel>
                  <Select
                    labelId="template-select-label"
                    id="template-select"
                    value={selectedTemplate}
                    label="Cargar desde plantilla guardada"
                    onChange={handleTemplateSelect}
                  >
                    <MenuItem value=""><em>— Escribir desde cero —</em></MenuItem>
                    {templates.map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{t.name}</span>
                          <Chip label={programLabel(t.programType)}
                            size="small" color="primary" variant="outlined" />
                          {t.variables?.length > 0 && (
                            <Chip label={`${t.variables.length} vars`}
                              size="small" color="secondary" variant="outlined" />
                          )}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedTemplate && (
                  <Alert severity="success" sx={{ mt: 1.5 }} icon={<ArticleIcon />}>
                    Plantilla cargada — puedes editarla libremente antes de enviar.
                  </Alert>
                )}
              </Box>
            )}
            <EmailEditor
              subject={form.subject}
              body={form.body}
              onSubjectChange={v => set('subject', v)}
              onBodyChange={v => set('body', v)}
              inputMode={editorMode}
              onInputModeChange={setEditorMode}
              variables={templateVariables}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Paso 3: Confirmar ────────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Confirmar Envío</Typography>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Campaña</Typography>
                <Typography fontWeight={600}>{form.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Programa</Typography>
                <Typography fontWeight={600}>{programLabel(form.programType)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Asunto</Typography>
                <Typography fontWeight={600}>{form.subject}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Destinatarios</Typography>
                <Typography variant="h5" fontWeight={800} color="primary.main">{form.recipients.length}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ mb: 3 }} />
            <Alert severity="warning" sx={{ mb: 3 }}>
              Se enviarán <strong>{form.recipients.length} correos</strong> desde tu cuenta institucional.
              Esta acción no se puede deshacer.
            </Alert>
            <RecipientTable recipients={form.recipients.slice(0, 5)} readOnly />
            {form.recipients.length > 5 && (
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                ...y {form.recipients.length - 5} destinatarios más
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Paso 4: Resultado ────────────────────────────────────────────── */}
      {step === 4 && sendResult && (
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {polling ? (
              <>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="h5" fontWeight={800} color="primary.main" mb={2}>
                  Enviando correos...
                </Typography>
              </>
            ) : (
              <Typography variant="h5" fontWeight={800}
                color={sendResult.failed > 0 ? 'warning.main' : 'success.main'} mb={2}>
                {sendResult.failed > 0 ? '⚠ Envío con errores' : '¡Envío Completado!'}
              </Typography>
            )}
            <Grid container spacing={3} justifyContent="center" mb={3}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Total</Typography>
                <Typography variant="h4" fontWeight={800}>{sendResult.total}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Enviados</Typography>
                <Typography variant="h4" fontWeight={800} color="success.main">{sendResult.sent}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Fallidos</Typography>
                <Typography variant="h4" fontWeight={800}
                  color={sendResult.failed > 0 ? 'error.main' : 'text.secondary'}>
                  {sendResult.failed}
                </Typography>
              </Grid>
            </Grid>
            <Button variant="contained" onClick={() => navigate('/campaigns')}>Ver Campañas</Button>
          </CardContent>
        </Card>
      )}

      {sendError && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setSendError('')}>{sendError}</Alert>
      )}

      {/* ── Botones de navegación ─────────────────────────────────────────── */}
      {step < 4 && (
        <Stack direction="row" justifyContent="space-between" mt={3}>
          <Button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            startIcon={<ArrowBackIcon />}
          >
            Anterior
          </Button>
          {step < 3 ? (
            <Button
              variant="contained"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              endIcon={<ArrowForwardIcon />}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSend}
              disabled={sending}
              startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            >
              {sending ? 'Enviando…' : `Enviar ${form.recipients.length} correos`}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
