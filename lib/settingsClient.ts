'use client';

import { toast } from 'sonner';

// 🛡️ BLINDAJE DE CONEXIÓN: punto único para leer/guardar los ajustes del usuario.
// Antes, cada página hacía su propio fetch('/api/settings') sin manejo de errores:
// si fallaba la red, la acción no hacía nada (o peor, se podían sobrescribir los
// ajustes reales de la nube con un objeto de error o vacío). Estas funciones
// evitan ambos problemas y siempre avisan al usuario de forma amigable.

/**
 * Lee los ajustes actuales del usuario desde la nube, mostrando un aviso si falla.
 * Devuelve `null` en caso de error para que el código que llama pueda abortar la
 * operación en curso en vez de continuar con datos incompletos o corruptos.
 */
export async function obtenerAjustes(): Promise<any | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    toast.error('Sin conexión', {
      description: 'No se pudieron cargar tus datos. Comprueba tu conexión a internet e inténtalo de nuevo.',
    });
    return null;
  }
}

/**
 * Igual que obtenerAjustes(), pero sin mostrar ningún aviso. Pensada para la carga
 * inicial de cada página: si falla, es mejor degradar en silencio a un estado por
 * defecto que bombardear al usuario con un toast justo al entrar.
 */
export async function obtenerAjustesSilencioso(): Promise<any> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return {};
    return await res.json();
  } catch (error) {
    return {};
  }
}

/**
 * Guarda los ajustes en la nube. Devuelve `true`/`false` para que quien llama solo
 * muestre un mensaje de éxito si realmente se guardó, y avisa siempre si falla en
 * vez de fallar en silencio (que era el comportamiento anterior).
 */
export async function guardarAjustes(ajustes: any): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ajustes),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (error) {
    toast.error('No se pudo guardar', {
      description: 'Hubo un problema de conexión. Tus últimos cambios no se han guardado en la nube; inténtalo de nuevo.',
    });
    return false;
  }
}
