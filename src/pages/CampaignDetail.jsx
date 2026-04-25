import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack, Button,
  CircularProgress, Alert, Divider, LinearProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ReplayIcon from '@mui/icons-material/Replay';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import RecipientTable from '../components/RecipientTable';
import { campaignApi } from '../api/pandoraApi';
import { statusColor, statusLabel, programLabel, CAMPAIGN_STATUS } from '../utils/statusHelpers';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState('');
  const [retryResult, setRetryResult] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendProgress, setSendProgress] = useState(null); // { current, total }
  const hubRef = useRef(null);

  const load = async () => {
    try {
      const [c, r] = await Promise.all([
        campaignApi.getById(id),
        campaignApi.getRecipients(id),
      ]);
      setCampaign(c.data);
      setRecipients(r.data);
    } catch {
      setError('Error al cargar la campaña.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Disconnect SignalR on unmount
  useEffect(() => () => { hubRef.current?.stop(); }, []);

  const connectHub = async (campaignId) => {
    const token = localStorage.getItem('pandora_token');
    const connection = new HubConnectionBuilder()
      .withUrl(`/hubs/progress?access_token=${token}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('progress', ({ current, total }) =>
      setSendProgress({ current, total }));

    await connection.start();
    await connection.invoke('JoinCampaign', campaignId);
    hubRef.current = connection;
    return connection;
  };

  const disconnectHub = async () => {
    if (hubRef.current) {
      try { await hubRef.current.stop(); } catch { /* ignore */ }
      hubRef.current = null;
    }
  };

  const handleSend = async () => {
    setSending(true);
    setSendProgress(null);
    try {
      await connectHub(id);
      await campaignApi.send(id);
      await load();
    } catch (err) {
      setError('Error al enviar: ' + (err.response?.data || err.message));
    } finally {
      await disconnectHub();
      setSendProgress(null);
      setSending(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setRetryResult(null);
    setError('');
    setSendProgress(null);
    try {
      await connectHub(id);
      const { data } = await campaignApi.retryFailed(id);
      setRetryResult(data);
      await load();
    } catch (err) {
      setError('Error al reintentar: ' + (err.response?.data || err.message));
    } finally {
      await disconnectHub();
      setSendProgress(null);
      setRetrying(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const { data } = await campaignApi.duplicate(id);
      navigate(`/campaigns/${data.id}`);
    } catch (err) {
      setError('Error al duplicar: ' + (err.response?.data || err.message));
      setDuplicating(false);
    }
  };

  const handleExport = () => {
    window.open(campaignApi.exportUrl(id), '_blank');
  };

  // Build preview HTML by substituting placeholders with sample data
  const buildPreview = () => {
    if (!campaign) return '';
    return campaign.body
      .replace(/\{\{nombre\}\}/g, 'Juan Pérez Ejemplo')
      .replace(/\{\{usuario\}\}/g, 'jperez')
      .replace(/\{\{contrasena\}\}/g, '••••••••')
      .replace(/\{\{programa\}\}/g, programLabel(campaign.programType));
  };

  if (loading) return <Box textAlign="center" py={8}><CircularProgress /></Box>;
  if (!campaign) return <Alert severity="error" sx={{ m: 4 }}>Campaña no encontrada.</Alert>;

  const sentPct = campaign.totalRecipients > 0
    ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100) : 0;

  const progressPct = sendProgress && sendProgress.total > 0
    ? Math.round((sendProgress.current / sendProgress.total) * 100) : 0;

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" alignItems="center" gap={2} mb={4} flexWrap="wrap">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/campaigns')}>Campañas</Button>
        <Typography variant="h4" fontWeight={800} color="primary.main" flexGrow={1}>{campaign.name}</Typography>
        <Chip label={statusLabel(campaign.status)} color={statusColor(campaign.status)} />

        <Tooltip title="Vista previa del correo">
          <IconButton onClick={() => setPreviewOpen(true)} color="primary">
            <VisibilityIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Exportar destinatarios a Excel">
          <IconButton onClick={handleExport} color="primary">
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Duplicar campaña">
          <IconButton onClick={handleDuplicate} disabled={duplicating} color="default">
            {duplicating ? <CircularProgress size={20} /> : <ContentCopyIcon />}
          </IconButton>
        </Tooltip>

        {campaign.status === CAMPAIGN_STATUS.DRAFT && (
          <Button
            variant="contained" color="secondary"
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            onClick={handleSend} disabled={sending}
          >
            {sending ? 'Enviando...' : 'Enviar Ahora'}
          </Button>
        )}

        {campaign.failedCount > 0 && campaign.status !== CAMPAIGN_STATUS.SENDING && (
          <Button
            variant="outlined" color="error"
            startIcon={retrying ? <CircularProgress size={16} color="inherit" /> : <ReplayIcon />}
            onClick={handleRetry} disabled={retrying}
          >
            {retrying ? 'Reintentando...' : `Reintentar ${campaign.failedCount} fallidos`}
          </Button>
        )}
      </Stack>

      {/* Live progress bar during send */}
      {sendProgress && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Enviando correos en tiempo real...
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {sendProgress.current} / {sendProgress.total}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progressPct} color="secondary" sx={{ borderRadius: 2, height: 10 }} />
          </CardContent>
        </Card>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {retryResult && (
        <Alert severity={retryResult.failed === 0 ? 'success' : 'warning'} sx={{ mb: 3 }} onClose={() => setRetryResult(null)}>
          Reintento completado — Enviados: <strong>{retryResult.sent}</strong> / {retryResult.total}
          {retryResult.failed > 0 && ` · Aún fallidos: ${retryResult.failed}`}
        </Alert>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Información de Campaña</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Asunto</Typography><Typography fontWeight={600}>{campaign.subject}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Programa</Typography><Typography fontWeight={600}>{programLabel(campaign.programType)}</Typography></Grid>
                {campaign.sentAt && <Grid item xs={6}><Typography variant="caption" color="text.secondary">Enviado</Typography><Typography fontWeight={600}>{new Date(campaign.sentAt).toLocaleString('es-MX')}</Typography></Grid>}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Estadísticas</Typography>
              <Stack spacing={1.5}>
                {[
                  { label: 'Total', value: campaign.totalRecipients, color: 'primary.main' },
                  { label: 'Enviados', value: campaign.sentCount, color: 'success.main' },
                  { label: 'Fallidos', value: campaign.failedCount, color: 'error.main' },
                ].map(s => (
                  <Stack key={s.label} direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                    <Typography variant="body2" fontWeight={700} color={s.color}>{s.value}</Typography>
                  </Stack>
                ))}
                {campaign.status !== 'Draft' && (
                  <>
                    <Divider />
                    <Box>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">Progreso</Typography>
                        <Typography variant="caption" fontWeight={700}>{sentPct}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={sentPct} color="success" sx={{ borderRadius: 2, height: 8 }} />
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Destinatarios</Typography>
          <RecipientTable recipients={recipients} readOnly />
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Vista previa del correo
          <IconButton onClick={() => setPreviewOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">Asunto: </Typography>
            <Typography variant="caption" fontWeight={700}>{campaign.subject}</Typography>
          </Box>
          <iframe
            title="preview"
            srcDoc={buildPreview()}
            style={{ width: '100%', minHeight: 500, border: 'none' }}
            sandbox="allow-same-origin"
          />
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, pl: 1 }}>
            Datos de muestra — los valores reales se sustituyen al enviar
          </Typography>
          <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
