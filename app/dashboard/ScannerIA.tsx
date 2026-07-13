'use client';

import { useState, useRef } from 'react';
import { procesarFacturaIA } from '../actions';

export default function ScannerIA() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArchivo(e.target.files[0]);
    }
  };

  const procesarFormulario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!archivo) return;

    setCargando(true);
    const formData = new FormData();
    formData.append('factura', archivo);

    try {
      // Ahora escuchamos lo que responde el servidor
      const resultado = await procesarFacturaIA(formData);

      if (resultado?.error) {
        // SI FALLA, TE SALTA UN AVISO EN PANTALLA
        alert("⚠️ ATENCIÓN: " + resultado.error);
      } else {
        // SI TODO VA BIEN, LIMPIAMOS LA CAJA
        setArchivo(null);
        if (formRef.current) formRef.current.reset();
      }
    } catch (error) {
      alert("⚠️ Error crítico: Tu web no ha podido conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={procesarFormulario} className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors p-6 group">
      
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm transition-all duration-300 ${archivo ? 'bg-green-100 text-green-600' : 'bg-white text-indigo-500 group-hover:scale-110 group-hover:text-pink-500'}`}>
        {archivo ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        )}
      </div>

      {archivo ? (
        <div className="text-center mb-4">
          <p className="text-sm font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 inline-block truncate max-w-[200px]">
            📸 {archivo.name}
          </p>
          <button type="button" onClick={() => setArchivo(null)} className="block mt-2 text-xs text-red-500 font-bold mx-auto hover:underline">
            Quitar foto
          </button>
        </div>
      ) : (
        <label className="cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-2.5 px-6 rounded-xl hover:shadow-lg hover:opacity-90 transition-all text-center w-full max-w-[200px] mb-3">
          Seleccionar Foto
          <input type="file" name="factura" accept="image/*" onChange={manejarCambioArchivo} className="hidden" />
        </label>
      )}

      <button 
        type="submit" 
        disabled={!archivo || cargando}
        className={`w-full max-w-[200px] font-bold py-2.5 px-6 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2 ${
          !archivo || cargando 
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {cargando ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Analizando...</span>
          </>
        ) : (
          <>
            <span>Analizar con IA</span>
            <span className="text-yellow-400">✨</span>
          </>
        )}
      </button>

      <span className="text-xs text-slate-400 mt-4 font-medium">Soporta JPG, PNG y WebP</span>
    </form>
  );
}