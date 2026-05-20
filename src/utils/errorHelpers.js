/**
 * Pandora — Mensajes de error amigables (#3)
 * Convierte errores de axios/HTTP en mensajes legibles para el usuario.
 */

const HTTP_MESSAGES = {
  400: 'La solicitud contiene datos inválidos. Revisa los campos e intenta de nuevo.',
  401: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  408: 'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.',
  409: 'Conflicto: el registro ya existe o fue modificado por otro usuario.',
  413: 'El archivo es demasiado grande. El tamaño máximo permitido es 10 MB.',
  422: 'Los datos enviados no son válidos. Revisa los campos requeridos.',
  429: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
  500: 'Error interno del servidor. Por favor contacta al administrador.',
  502: 'El servidor no está disponible en este momento. Intenta más tarde.',
  503: 'El servicio está temporalmente fuera de línea. Intenta más tarde.',
};

/**
 * Extrae un mensaje amigable de un error de axios u otro error.
 * @param {any} err - El error capturado
 * @param {string} [fallback] - Mensaje por defecto si no se puede determinar
 * @returns {string}
 */
export function friendlyError(err, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  if (!err) return fallback;

  // Error de red (sin respuesta)
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
    return 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
  }

  const status = err.response?.status;

  // Si el backend devolvió un mensaje legible, usarlo
  const serverMsg =
    err.response?.data?.message  ||
    err.response?.data?.title    ||
    err.response?.data?.error    ||
    err.response?.data;

  if (typeof serverMsg === 'string' && serverMsg.length < 300) {
    // Evitar mensajes técnicos del stack de .NET
    if (!serverMsg.includes('System.') && !serverMsg.includes('at ') && !serverMsg.includes('Microsoft.')) {
      return serverMsg;
    }
  }

  if (status && HTTP_MESSAGES[status]) return HTTP_MESSAGES[status];

  if (err.message && !err.message.toLowerCase().includes('request failed')) {
    return err.message;
  }

  return fallback;
}

/**
 * Determina el severity de Alert según el tipo de error.
 */
export function errorSeverity(err) {
  const status = err?.response?.status;
  if (!status || status >= 500) return 'error';
  if (status === 401 || status === 403) return 'warning';
  return 'error';
}
