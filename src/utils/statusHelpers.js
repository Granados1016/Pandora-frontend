export const statusColor = (status) => ({
  // Valores en español (backend actual)
  'Pendiente':               'default',
  'Enviando':                'warning',
  'Completado':              'success',
  'Completado con errores':  'error',
  // Valores legacy en inglés (compatibilidad)
  Draft:           'default',
  Sending:         'warning',
  Completed:       'success',
  PartiallyFailed: 'error',
  Sent:            'success',
  Failed:          'error',
  Pending:         'default',
})[status] || 'default';

export const statusLabel = (status) => ({
  // Valores en español (backend actual) — se devuelven tal cual
  'Pendiente':               'Pendiente',
  'Enviando':                'Enviando…',
  'Completado':              'Completado',
  'Completado con errores':  'Con errores',
  // Valores legacy en inglés
  Draft:           'Borrador',
  Sending:         'Enviando…',
  Completed:       'Completado',
  PartiallyFailed: 'Con errores',
  Sent:            'Enviado',
  Failed:          'Fallido',
  Pending:         'Pendiente',
})[status] || status;

export const programLabel = (type) => ({
  1: 'Licenciatura',
  2: 'Posgrado',
  3: 'Preparatoria',
  4: 'Notificaciones',
})[type] || 'Desconocido';

export const CAMPAIGN_STATUS = {
  DRAFT: 'Draft',
  SENDING: 'Sending',
  COMPLETED: 'Completed',
  PARTIALLY_FAILED: 'PartiallyFailed',
};

export const PROGRAM_TYPE = {
  LICENCIATURA:   1,
  POSGRADO:       2,
  PREPARATORIA:   3,
  NOTIFICACIONES: 4,
};
