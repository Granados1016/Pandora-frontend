import React, { useState } from 'react';
import {
  Box, Grid, Typography, Button, Stack, Drawer, List, ListItem,
  ListItemText, Switch, IconButton, Tooltip, Divider, Chip, Paper,
  FormControlLabel, Alert,
} from '@mui/material';
import TuneIcon        from '@mui/icons-material/Tune';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RestoreIcon     from '@mui/icons-material/Restore';
import CloseIcon       from '@mui/icons-material/Close';
import DashboardIcon   from '@mui/icons-material/Dashboard';

import { useAuth, MODULES } from '../hooks/useAuth.jsx';
import { useDashboardLayout } from '../hooks/useDashboardLayout.js';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh.js';
import {
  WelcomeWidget,
  MailStatsWidget,
  QuickActionsWidget,
  RecentCampaignsWidget,
  InventoryWidget,
  CalendarTodayWidget,
  TicketsWidget,
  LicenciasWidget,
  WIDGET_META,
} from '../components/dashboard/Widgets.jsx';

// ─── Mapa widget-id → componente ─────────────────────────────────────────────

function WidgetRenderer({ id, extraProps }) {
  const { refreshKey } = extraProps;
  switch (id) {
    case 'welcome':         return <WelcomeWidget {...extraProps} />;
    case 'mailStats':       return <MailStatsWidget refreshKey={refreshKey} />;
    case 'quickActions':    return <QuickActionsWidget hasModule={extraProps.hasModule} />;
    case 'recentCampaigns': return <RecentCampaignsWidget refreshKey={refreshKey} />;
    case 'inventory':       return <InventoryWidget refreshKey={refreshKey} />;
    case 'calendar':        return <CalendarTodayWidget refreshKey={refreshKey} />;
    case 'tickets':         return <TicketsWidget refreshKey={refreshKey} />;
    case 'licencias':       return <LicenciasWidget refreshKey={refreshKey} />;
    default:                return null;
  }
}

// ─── Panel de personalización (Drawer) ───────────────────────────────────────

function PersonalizeDrawer({ open, onClose, layout, toggleWidget, reorderWidget, resetLayout, hasModule }) {
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const onDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingIdx(idx);
  };
  const onDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== draggingIdx) setDragOverIdx(idx);
  };
  const onDrop = (e, idx) => {
    e.preventDefault();
    if (draggingIdx !== null && draggingIdx !== idx) reorderWidget(draggingIdx, idx);
    setDraggingIdx(null);
    setDragOverIdx(null);
  };
  const onDragEnd = () => { setDraggingIdx(null); setDragOverIdx(null); };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 320, display: 'flex', flexDirection: 'column' } }}>

      {/* Cabecera */}
      <Box sx={{ p: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneIcon color="primary" fontSize="small" />
            <Typography variant="h6" fontWeight={700}>Personalizar</Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Activa, desactiva y arrastra para reordenar los widgets.
        </Typography>
      </Box>

      {/* Lista de widgets */}
      <List sx={{ flex: 1, overflowY: 'auto', pt: 1 }}>
        {layout.map((item, idx) => {
          const meta       = WIDGET_META[item.id];
          if (!meta) return null;
          const accessible = meta.module === null || hasModule(meta.module);
          const isDragging = draggingIdx === idx;
          const isOver     = dragOverIdx === idx;

          return (
            <ListItem
              key={item.id}
              draggable={accessible}
              onDragStart={e => onDragStart(e, idx)}
              onDragOver={e  => onDragOver(e, idx)}
              onDrop={e      => onDrop(e, idx)}
              onDragEnd={onDragEnd}
              sx={{
                borderRadius: 2, mx: 1, mb: 0.5,
                border: '1px solid',
                borderColor: isOver ? 'primary.main' : 'transparent',
                bgcolor: isDragging ? 'action.selected' : isOver ? 'primary.50' : 'transparent',
                opacity: isDragging ? 0.45 : 1,
                transition: 'all 0.1s',
                cursor: accessible ? 'grab' : 'default',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              {/* Drag handle */}
              <Box sx={{ color: accessible ? 'text.disabled' : 'transparent', mr: 1, mt: 0.2 }}>
                <DragIndicatorIcon fontSize="small" />
              </Box>

              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600}
                    color={accessible ? 'text.primary' : 'text.disabled'}>
                    {meta.label}
                  </Typography>
                }
                secondary={
                  !accessible
                    ? <Typography variant="caption" color="text.disabled">Sin acceso al módulo</Typography>
                    : null
                }
              />

              <Switch
                checked={item.enabled && accessible}
                disabled={!accessible}
                onChange={() => toggleWidget(item.id)}
                size="small"
                color="primary"
              />
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Pie */}
      <Box sx={{ p: 2 }}>
        <Alert severity="info" icon={false} sx={{ mb: 1.5, py: 0.5, fontSize: 12 }}>
          Arrastra los widgets para cambiar el orden. Los cambios se guardan automáticamente.
        </Alert>
        <Button
          fullWidth variant="outlined" size="small"
          startIcon={<RestoreIcon />}
          onClick={() => { resetLayout(); }}
        >
          Restaurar configuración por defecto
        </Button>
      </Box>
    </Drawer>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { username, fullName, isAdmin, hasModule } = useAuth();
  const { layout, toggleWidget, reorderWidget, resetLayout } = useDashboardLayout(username);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const refreshKey = useDashboardRefresh(60_000); // actualiza cada 60 s + en cada notificación SignalR

  // Props que se pasan a widgets que las necesiten
  const extraProps = { fullName, username, isAdmin, hasModule, refreshKey,
    position: typeof window !== 'undefined' ? localStorage.getItem('pandora_user_position') : null,
  };

  // Solo mostrar widgets habilitados y con acceso al módulo
  const visibleWidgets = layout.filter(item => {
    if (!item.enabled) return false;
    const meta = WIDGET_META[item.id];
    if (!meta) return false;
    return meta.module === null || hasModule(meta.module);
  });

  const enabledCount  = layout.filter(w => w.enabled).length;
  const disabledCount = layout.filter(w => !w.enabled).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* Cabecera */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <DashboardIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">Dashboard</Typography>
            <Typography variant="caption" color="text.secondary">
              {enabledCount} widget{enabledCount !== 1 ? 's' : ''} activo{enabledCount !== 1 ? 's' : ''}
              {disabledCount > 0 && ` · ${disabledCount} oculto${disabledCount !== 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="outlined"
          startIcon={<TuneIcon />}
          onClick={() => setDrawerOpen(true)}
          size="small"
        >
          Personalizar
        </Button>
      </Stack>

      {/* Grid de widgets */}
      <Grid container spacing={2.5}>
        {visibleWidgets.map(item => {
          const meta = WIDGET_META[item.id];
          return (
            <Grid item key={item.id} {...meta.gridProps}>
              <WidgetRenderer id={item.id} extraProps={extraProps} />
            </Grid>
          );
        })}

        {visibleWidgets.length === 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <DashboardIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1}>No hay widgets activos</Typography>
              <Typography variant="body2" color="text.disabled" mb={2}>
                Usa el botón <strong>Personalizar</strong> para activar widgets en tu dashboard.
              </Typography>
              <Button variant="contained" startIcon={<TuneIcon />} onClick={() => setDrawerOpen(true)}>
                Personalizar Dashboard
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Panel de personalización */}
      <PersonalizeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        layout={layout}
        toggleWidget={toggleWidget}
        reorderWidget={reorderWidget}
        resetLayout={resetLayout}
        hasModule={hasModule}
      />
    </Box>
  );
}
