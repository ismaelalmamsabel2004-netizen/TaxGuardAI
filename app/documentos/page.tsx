"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { obtenerDatosSupabase, actualizarEstadoPago } from '../actions';

export default function DocumentosPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("ALL"); // ALL, PENDIENTE, COBRADO
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      obtenerDatosSupabase().then(d => {
        if (d && d.length > 0) setData(d);
      });
    }
  }, [isLoaded, isSignedIn]);

  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    const res = await actualizarEstadoPago(id, nuevoEstado);
    if (res.success) {
      setData(data.map(item => item.id === id ? { ...item, estado_pago: nuevoEstado } : item));
    }
  };

  const documentosFiltrados = data.filter(item => {
    const matchSearch = 
      (item.cliente_nombre?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.numero_factura?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.nombre_archivo?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      
    const matchEstado = filtroEstado === "ALL" ? true : item.estado_pago === filtroEstado;

    return matchSearch && matchEstado;
  });

  const facturasPendientes = data.filter(d => d.estado_pago === "PENDIENTE").length;
  const dineroPendiente = data.filter(d => d.estado_pago === "PENDIENTE" && d.total > 0).reduce((acc, curr) => acc + curr.total, 0);

  if (!isLoaded) return <div className="min-h-screen bg-[#F4F5F7]"></div>;

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans" translate="no">
        
        {/* SIDEBAR BÁSICO (Para navegar) */}
        <aside className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 hidden lg:flex flex-col border-r border-slate-800">
          <div className="flex items-center gap-3 mb-10">
            <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-9 h-9 bg-white rounded-xl p-1" />
            <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
          </div>
          <nav className="space-y-1">
            <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
              Consola General
            </Link>
            <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/documentos">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              Gestor Documental
            </Link>
          </nav>
          <div className="mt-auto flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
            <UserButton/>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto w-full relative">
          <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Archivo y <span className="text-rose-600">Morosidad</span></h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Busca facturas pasadas y controla quién te debe dinero.</p>
            </div>
            {/* WIDGET RADAR MOROSIDAD */}
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-6 shadow-sm">
                <div>
                    <p className="text-[10px] font-black uppercase text-rose-800 tracking-widest">Radar de Morosidad</p>
                    <p className="text-xs font-medium text-rose-600 mt-0.5">{facturasPendientes} facturas sin cobrar</p>
                </div>
                <div className="text-right border-l border-rose-200 pl-6">
                    <p className="text-2xl font-black text-rose-600">{dineroPendiente.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>
                </div>
            </div>
          </header>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por nombre, NIF o Nº factura..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-96 p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex gap-2 w-full sm:w-auto bg-slate-200/50 p-1.5 rounded-xl">
                    <button onClick={() => setFiltroEstado("ALL")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filtroEstado === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todas</button>
                    <button onClick={() => setFiltroEstado("PENDIENTE")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filtroEstado === 'PENDIENTE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}>Pendientes</button>
                    <button onClick={() => setFiltroEstado("COBRADO")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filtroEstado === 'COBRADO' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>Completadas</button>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Documento / Cliente</th>
                    <th className="px-6 py-4">Importe Total</th>
                    <th className="px-6 py-4">Emisión</th>
                    <th className="px-6 py-4">Archivo</th>
                    <th className="px-6 py-4 text-right">Estado Financiero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {documentosFiltrados.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{item.cliente_nombre || item.concepto_detalle || "Factura / Ticket"}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">Nº: {item.numero_factura || "S/N"} {item.cliente_nif ? `| NIF: ${item.cliente_nif}` : ""}</p>
                      </td>
                      <td className={`px-6 py-4 font-black ${item.total >= 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                        {Math.abs(item.total).toLocaleString('es-ES')} €
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{item.name}</td>
                      <td className="px-6 py-4">
                        {item.url_archivo ? (
                            <a href={item.url_archivo} target="_blank" className="text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition flex items-center gap-2 w-fit">
                                📎 Ver Fichero
                            </a>
                        ) : (
                            <span className="text-slate-300 text-xs italic">Sin adjunto</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.estado_pago === "PENDIENTE" ? (
                            <div className="flex items-center justify-end gap-3">
                                <span className="text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Pendiente</span>
                                <button onClick={() => cambiarEstado(item.id, "COBRADO")} className="text-xs font-bold text-emerald-600 hover:underline">Marcar Cobrado ✓</button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-end gap-3">
                                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Cobrado</span>
                                <button onClick={() => cambiarEstado(item.id, "PENDIENTE")} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:underline">Revertir</button>
                            </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {documentosFiltrados.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-sm font-bold text-slate-400">No hay documentos en este filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </Show>
  );
}