"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [aiAnalysis, setAiAnalysis] = useState("Cargando auditoría de rendimiento...");
  const [data, setData] = useState<{id?: number, name: string, total: number}[]>([]); 
  const [mes, setMes] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // 🆕 1. ESTADO PARA EL FILTRO ACTIVO
  const [filtro, setFiltro] = useState("all");

  const ordenarPorFecha = (datos: any[]) => {
    return [...datos].sort((a, b) => {
      const pA = a.name.split('/');
      const pB = b.name.split('/');
      const fechaA = new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime();
      const fechaB = new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime();
      return fechaA - fechaB; 
    });
  };

  // 🆕 2. FUNCIÓN QUE CORTA EL TIEMPO
  const filtrarDatos = (datosBase: any[], tipoFiltro: string) => {
    if (tipoFiltro === "all") return datosBase;
    
    const ahora = new Date().getTime();
    return datosBase.filter(item => {
      const [d, m, y] = item.name.split('/');
      const fechaItem = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
      const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);
      
      if (tipoFiltro === 'month') return diffDias <= 30;
      if (tipoFiltro === 'quarter') return diffDias <= 90;
      if (tipoFiltro === 'year') return diffDias <= 365;
      return true;
    });
  };

  // 🆕 3. CÁLCULO EN TIEMPO REAL: Aplicamos el filtro al instante
  const datosVisibles = filtrarDatos(data, filtro);

  const totalFacturado = datosVisibles.reduce((sum, item) => sum + item.total, 0);
  const promedio = datosVisibles.length > 0 ? (totalFacturado / datosVisibles.length) : 0;
  const maximo = datosVisibles.length > 0 ? Math.max(...datosVisibles.map(i => i.total)) : 0;

  // 🆕 4. ORDENAR A GEMINI QUE RE-ANALICE AL PULSAR EL BOTÓN
  const cambiarFiltro = (nuevoFiltro: string) => {
    setFiltro(nuevoFiltro);
    const datosFiltrados = filtrarDatos(data, nuevoFiltro);
    pedirAnalisisGemini(datosFiltrados);
  };

  useEffect(() => {
    fetch('/api/finances')
      .then(res => res.ok ? res.json() : [])
      .then(d => {
        if (d && d.length > 0) {
          const ordenados = ordenarPorFecha(d);
          setData(ordenados);
          pedirAnalisisGemini(ordenados); 
        } else {
          setAiAnalysis("Sistema listo. Ingrese registros de facturación para activar la auditoría automatizada.");
        }
      });
  }, []);

  const guardarDato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mes || !ingreso) return;
    setIsSaving(true);
    const [y, m, d] = mes.split('-');
    const fecha = `${d}/${m}/${y}`;
    
    const res = await fetch('/api/finances', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ month: fecha, total: Number(ingreso) })
    });
    if (res.ok) {
      const nuevo = await res.json();
      const actualizados = ordenarPorFecha([...data, nuevo]);
      setData(actualizados);
      setIngreso('');
      
      // La IA analiza el contexto del filtro actual
      const filtrados = filtrarDatos(actualizados, filtro);
      pedirAnalisisGemini(filtrados);
    }
    setIsSaving(false);
  };

  const eliminarDato = async (id: number) => {
    const res = await fetch(`/api/finances?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      const restantes = data.filter(item => item.id !== id);
      setData(restantes);
      
      const filtrados = filtrarDatos(restantes, filtro);
      if (filtrados.length >= 2) {
        pedirAnalisisGemini(filtrados);
      } else {
        setAiAnalysis("Muestras insuficientes en este periodo para generar una proyección fiable.");
      }
    }
  };

  const pedirAnalisisGemini = (d: any[]) => {
    if (d.length < 2) {
      setAiAnalysis("Muestras insuficientes en este periodo para generar una proyección fiable.");
      return;
    }
    setAiAnalysis("Procesando métricas estructurales del periodo...");
    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: d }),
    })
      .then(r => r.json())
      .then(r => setAiAnalysis(r.analysis || "Error al estructurar el reporte."))
      .catch(() => setAiAnalysis("Error en el servidor de inteligencia artificial."));
  };

  const exportarAExcel = () => {
    if (datosVisibles.length === 0) {
      alert("No hay datos para exportar en este periodo.");
      return;
    }
    let csvContent = "Fecha,Ingreso Neto (EUR)\n";
    // 🆕 Exporta solo los datos del filtro seleccionado
    datosVisibles.forEach(row => {
      csvContent += `${row.name},${row.total}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Exportacion_TaxGuardAI_${filtro}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-slate-50 font-sans">
          
          <aside className="w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">T</div>
                <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
              </div>
              
              <nav className="space-y-1">
                <a href="#" className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
                </a>
                <a href="#" className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
                </a>
              </nav>
            </div>
            
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
              <UserButton />
            </div>
          </aside>

          <main className="flex-1 p-10 overflow-y-auto">
            
            <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control Ejecutivo</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Supervisión integrada de flujos de caja corporativos.</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Servidores Cloud Conectados
              </div>
            </header>

            {/* 🆕 BARRA DE FILTROS DE TIEMPO */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
              <button onClick={() => cambiarFiltro('all')} className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>
                Todo el Historial
              </button>
              <button onClick={() => cambiarFiltro('month')} className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'month' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>
                Últimos 30 días
              </button>
              <button onClick={() => cambiarFiltro('quarter')} className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'quarter' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>
                Último Trimestre
              </button>
              <button onClick={() => cambiarFiltro('year')} className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'year' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>
                Último Año
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { title: 'Volumen Facturado', value: totalFacturado, color: 'text-blue-600' },
                { title: 'Rendimiento Medio', value: Math.round(promedio), color: 'text-slate-900' },
                { title: 'Techo de Ingresos', value: maximo, color: 'text-slate-900' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.title}</span>
                  <span className={`text-3xl font-black ${kpi.color} tracking-tight mt-3`}>{kpi.value.toLocaleString()} €</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Asistente de Entrada</h3>
                  <p className="text-xs text-slate-400 mb-6">Registre ingresos validados por fecha.</p>
                  
                  <form onSubmit={guardarDato} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Operativa</label>
                      <input type="date" value={mes} onChange={(e) => setMes(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Importe Neto (€)</label>
                      <input type="number" placeholder="Ej: 2450" value={ingreso} onChange={(e) => setIngreso(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm shadow-blue-600/10 disabled:opacity-50">
                      {isSaving ? "Procesando..." : "Asignar Registro"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[350px]">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Curva de Tendencia Analítica</h3>
                  <p className="text-xs text-slate-400 mb-6">Proyección y comportamiento de ingresos en el periodo.</p>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosVisibles} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                      <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                  <div>
                    <h3 className="text-md font-bold text-slate-900 mb-1">Libro Diario</h3>
                    <p className="text-xs text-slate-400">Datos del periodo activo.</p>
                  </div>
                  <button onClick={exportarAExcel} className="flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-100 transition border border-emerald-200 shadow-sm" title="Descargar vista actual">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Exportar
                  </button>
                </div>
                
                <div className="flex-1 max-h-[300px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Monto</th>
                        <th className="px-6 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                      {datosVisibles.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-6 py-3.5 text-slate-600">{item.name}</td>
                          <td className="px-6 py-3.5 text-blue-600 font-bold">{item.total.toLocaleString()} €</td>
                          <td className="px-6 py-3.5 text-right">
                            <button onClick={() => item.id && eliminarDato(item.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {datosVisibles.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-xs text-slate-400">Sin registros en este periodo de tiempo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 className="text-md font-bold text-slate-900">Dictamen e Inteligencia Financiera</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Informe automatizado filtrado por el periodo actual.</p>
                </div>
                
                <div className="flex-1 bg-slate-50/50 rounded-xl p-6 border border-slate-200/60 overflow-y-auto max-h-[300px]">
                  <div className="text-slate-600 text-sm font-medium leading-relaxed prose max-w-none 
                    [&>p]:mb-4 
                    [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-4
                    [&>ol]:list-decimal [&>ol]:ml-5 [&>ol]:mb-4
                    [&>strong]:text-slate-900 [&>strong]:font-bold">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
          <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto mb-4 shadow-lg shadow-blue-600/20">T</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">TaxGuard<span className="text-blue-600">AI</span></h2>
            <p className="text-slate-400 mt-2 text-sm font-medium">Plataforma Inteligente de Análisis Financiero Corporativo.</p>
            <div className="w-full bg-slate-100 h-[1px] my-8" />
            <SignInButton mode="modal">
              <button className="w-full bg-slate-950 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-950/10 text-sm">
                Autenticar Acceso Corporativo
              </button>
            </SignInButton>
          </div>
        </div>
      </Show>
    </>
  );
}