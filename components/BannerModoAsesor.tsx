"use client";

export default function BannerModoAsesor({
  nombreCliente,
  onSalir,
}: {
  nombreCliente: string;
  onSalir: () => void;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg shadow-blue-600/20">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">Modo Asesor · Solo lectura</p>
        <p className="text-sm font-bold">
          Estás auditando el espacio <span className="underline decoration-white/40">{nombreCliente}</span>
        </p>
        <p className="text-[11px] text-blue-100 mt-0.5 font-medium">
          Puedes consultar datos e informes. No puedes crear, editar ni borrar movimientos.
        </p>
      </div>
      <button
        type="button"
        onClick={onSalir}
        className="shrink-0 bg-white text-blue-700 px-5 py-2.5 rounded-xl font-black text-xs hover:bg-blue-50 transition shadow-md"
      >
        Salir a Mi Espacio
      </button>
    </div>
  );
}
