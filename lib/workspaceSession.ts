/** Persistencia de sesión del Modo Asesor (CLIENTE|…) — no se guarda en user_settings. */

export const ESPACIO_SESION_KEY = 'taxguard_espacio_activo';

export function esEspacioCliente(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('CLIENTE|');
}

export function nombreEspacioVisible(id: string): string {
  if (!id) return 'Espacio';
  if (esEspacioCliente(id)) {
    const parts = id.split('|');
    return parts[2] || 'Cliente';
  }
  if (id === 'undefined' || id === 'CLIENTE_undefined') return 'Mi Empresa Principal';
  return id;
}

export function leerEspacioSesion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(ESPACIO_SESION_KEY);
    return v && esEspacioCliente(v) ? v : null;
  } catch {
    return null;
  }
}

export function guardarEspacioSesion(id: string) {
  if (typeof window === 'undefined') return;
  try {
    if (esEspacioCliente(id)) sessionStorage.setItem(ESPACIO_SESION_KEY, id);
    else sessionStorage.removeItem(ESPACIO_SESION_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function limpiarEspacioSesion() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ESPACIO_SESION_KEY);
  } catch {
    /* ignore */
  }
}

/** Resuelve el espacio inicial: sesión asesor > empresaActiva de ajustes > primera empresa. */
export function resolverEspacioInicial(
  empresaActivaAjustes: string | undefined,
  empresas: string[],
): string {
  const sesion = leerEspacioSesion();
  if (sesion) return sesion;
  let activa = empresaActivaAjustes || empresas[0] || 'Mi Empresa Principal';
  if (activa === 'undefined' || activa === 'CLIENTE_undefined' || esEspacioCliente(activa)) {
    activa = empresas[0] || 'Mi Empresa Principal';
  }
  return activa;
}
