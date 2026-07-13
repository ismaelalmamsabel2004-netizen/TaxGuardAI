'use client';

import { useState } from 'react';
import { borrarTransaccion } from '../actions';

export default function BotoBorrar({ transaccionId }: { transaccionId: string }) {
  const [cargando, setCargando] = useState(false);

  const manejarBorrado = async () => {
    // Preguntamos para confirmar (Seguridad extra)
    if (!confirm("¿Seguro que quieres borrar este movimiento? No podrás recuperarlo.")) return;

    setCargando(true);
    
    // Llamamos al "borrador" de Supabase
    const resultado = await borrarTransaccion(transaccionId);

    if (resultado?.error) {
      alert("⚠️ Error: " + resultado.error);
      setCargando(false);
    }
    // Si va bien, revalidatePath('/dashboard') hará que la fila desaparezca sola
  };

  return (
    <button 
      onClick={manejarBorrado} 
      disabled={cargando}
      className={`p-2.5 rounded-xl transition-all duration-200 ${
        cargando 
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
          : 'bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 hover:border-rose-100 shadow-sm'
      }`}
    >
      {cargando ? (
        // Ruedecita de carga animada
        <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      ) : (
        // Icono de papelera (🗑️)
        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      )}
    </button>
  );
}