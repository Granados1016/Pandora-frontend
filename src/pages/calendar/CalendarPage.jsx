import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es-us';
import {
  Box, Button, ButtonGroup, Typography, Stack, Paper,
  Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import { calendarApi, catalogApi } from '../../api/pandoraApi';
import ReservationModal from './ReservationModal';
import { useAuth, MODULES } from '../../hooks/useAuth.jsx';

// ─── Vistas disponibles ───────────────────────────────────────────────────────
const VIEWS = [
  { key: 'timeGridDay',    label: 'Día' },
  { key: 'timeGridWeek',   label: 'Semana' },
  { key: 'dayGridMonth',   label: 'Mes' },
  { key: 'multiMonthYear', label: 'Año' },
];

const toFcEvent = (r) => ({
  id:              r.id,
  title:           r.title,
  start:           r.startTime,
  end:             r.endTime,
  backgroundColor: r.roomColor,
  borderColor:     r.roomColor,
  textColor:       '#fff',
  extendedProps:   r,
});

export default function CalendarPage() {
  const navigate = useNavigate();
  const { hasModule, hasModuleWrite, hasSubModule, isAdmin } = useAuth();
  const canManage = hasModuleWrite(MODULES.CALENDARIO_ADMIN);
  // canRequest: tiene el sub-bit CAL_REQUEST pero NO es gestor completo
  const canRequest = (hasSubModule(MODULES.CAL_REQUEST) || isAdmin) && !canManage;

  const calRef = useRef(null);
  const [view, setView]           = useState('timeGridWeek');
  const [events, setEvents]       = useState([]);
  const [rooms, setRooms]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterRoom, setFilterRoom] = useState('');
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);
  const [range, setRange]         = useState({ start: null, end: null });

  // Cargar salas y empleados una vez
  useEffect(() => {
    Promise.all([calendarApi.getRooms(), catalogApi.getEmployees()])
      .then(([rr, er]) => { setRooms(rr.data.filter(r => r.isActive)); setEmployees(er.data); })
      .catch(() => {});
  }, []);

  // Cargar eventos cuando cambia el rango o el filtro de sala
  const loadEvents = useCallback(async (start, end) => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const r = await calendarApi.getReservations(start, end, filterRoom || undefined);
      let evts = r.data.map(toFcEvent);
      if (filterRoom) evts = evts.filter(e => e.extendedProps.roomId === filterRoom);
      setEvents(evts);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [filterRoom]);

  const handleDatesSet = useCallback(({ startStr, endStr }) => {
    setRange({ start: startStr, end: endStr });
    loadEvents(startStr, endStr);
  }, [loadEvents]);

  // Recargar cuando cambia el filtro de sala
  useEffect(() => {
    if (range.start) loadEvents(range.start, range.end);
  }, [filterRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeView = (v) => {
    setView(v);
    calRef.current?.getApi().changeView(v);
  };

  // Click en evento existente → abrir modal edición (solo para gestores)
  const handleEventClick = ({ event }) => {
    if (!canManage) return;
    setModalInitial(event.extendedProps);
    setModalOpen(true);
  };

  // Drag/click para seleccionar rango:
  //   • Gestor (canManage)  → abre modal de reserva directo
  //   • Solicitante (canRequest) → navega al formulario con fechas pre-llenadas
  const handleSelect = ({ startStr, endStr }) => {
    if (canManage) {
      setModalInitial({ start: startStr, end: endStr });
      setModalOpen(true);
    } else if (canRequest) {
      navigate('/calendar/solicitud', { state: { start: startStr, end: endStr } });
    }
  };

  const handleNewReservation = () => {
    setModalInitial(null);
    setModalOpen(true);
  };

  const handleSaved = () => loadEvents(range.start, range.end);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, height: '100%' }}>
      {/* Toolbar */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between" flexWrap="wrap">
          {/* Título + loading */}
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Pandora Calendar</Typography>
            {loading && <CircularProgress size={18} />}
          </Stack>

          {/* Controles */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Filtro sala */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="filter-room-label">Sala</InputLabel>
              <Select labelId="filter-room-label" id="filter-room" value={filterRoom} label="Sala" onChange={e => setFilterRoom(e.target.value)}>
                <MenuItem value="">Todas las salas</MenuItem>
                {rooms.map(r => (
                  <MenuItem key={r.id} value={r.id}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color, flexShrink: 0 }} />
                      <span>{r.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Vistas */}
            <ButtonGroup size="small" variant="outlined">
              {VIEWS.map(v => (
                <Button
                  key={v.key}
                  variant={view === v.key ? 'contained' : 'outlined'}
                  onClick={() => changeView(v.key)}
                >
                  {v.label}
                </Button>
              ))}
            </ButtonGroup>

            {/* Nueva reserva — solo para gestores */}
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewReservation} sx={{ borderRadius: 2 }}>
                Nueva reserva
              </Button>
            )}

            {/* Exportar iCal */}
            <Tooltip title="Exportar como archivo iCalendar (.ics)">
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                onClick={() => calendarApi.exportICal().catch(e => alert(e.message))}
                sx={{ borderRadius: 2 }}>
                .ics
              </Button>
            </Tooltip>

            {/* Solicitar sala — para usuarios con CAL_REQUEST */}
            {canRequest && (
              <Tooltip title="Selecciona un día en el calendario para pre-llenar la fecha, o haz clic aquí">
                <Button
                  variant="outlined"
                  startIcon={<MeetingRoomIcon />}
                  onClick={() => navigate('/calendar/solicitud')}
                  sx={{ borderRadius: 2 }}
                >
                  Solicitar sala
                </Button>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {/* Leyenda de salas */}
        {rooms.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
            {rooms.map(r => (
              <Chip
                key={r.id} size="small"
                label={r.name}
                onClick={() => setFilterRoom(filterRoom === r.id ? '' : r.id)}
                sx={{
                  bgcolor: filterRoom === r.id || !filterRoom ? r.color : 'grey.200',
                  color: filterRoom === r.id || !filterRoom ? '#fff' : 'text.secondary',
                  fontWeight: 600, fontSize: 11,
                  '&:hover': { opacity: 0.85 },
                }}
              />
            ))}
          </Stack>
        )}
      </Paper>

      {/* Calendario */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView={view}
          locale={esLocale}
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  '',
          }}
          events={events}
          selectable={canManage || canRequest}
          selectMirror={canManage || canRequest}
          dayMaxEvents
          weekends
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          height="calc(100vh - 210px)"
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleSelect}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventContent={({ event }) => (
            <Box sx={{ px: 0.5, overflow: 'hidden', lineHeight: 1.3 }}>
              <Typography variant="caption" fontWeight={700} noWrap display="block">
                {event.title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap display="block">
                {event.extendedProps?.roomName}
              </Typography>
            </Box>
          )}
        />
      </Paper>

      {/* Modal */}
      <ReservationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalInitial(null); }}
        onSaved={handleSaved}
        rooms={rooms}
        employees={employees}
        initial={modalInitial}
      />
    </Box>
  );
}
