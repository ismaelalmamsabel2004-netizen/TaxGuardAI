"use client";

import { useState, useEffect } from "react";
// 🚀 IMPORTAMOS useUser y useRouter para el bloqueo de seguridad
import { useUser, UserButton, Show, SignInButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#6366f1', '#14b8a6', '#64748b'];

export default function AnalisisAvanzado() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [perfilEmpresa, setPerfilEmpresa] = useState({ sector: "", objetivo: "" });
  
  const [allData, setAllData] = useState<any[]>([]);
  const [filtroTiempo, setFiltroTiempo] = useState("year"); 
  const [aiAnalysis, setAiAnalysis] = useState("## Análisis Preliminar\nPara iniciar la auditoría profunda, asegúrate de tener datos registrados en el Libro Mayor y pulsa el botón superior **Generar Nueva Auditoría**.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [chartDataEvolucion, setChartDataEvolucion] = useState<any[]>([]);
  const [chartDataGastos, setChartDataGastos] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ ingresos: 0, gastos: 0, beneficio: 0, margen: 0 });

  // 🚀 Empezamos en estado loading para evitar parpadeos visuales
  const [planActivo, setPlanActivo] = useState('loading');

  useEffect(() => {
    setIsMounted(true);
    
    // Solo busca el plan si el usuario está conectado
    if (!isLoaded) return;
    if (!isSignedIn) return;

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         
         // 🚀 EXPULSIÓN INMEDIATA SI NO ES PRO (El análisis avanzado es solo para el plan Pro de 89€)
         // Opcionalmente: si quieres que el autónomo lo vea, cambia esta lógica.
         if (planDetectado === 'free') {
            router.push('/precios');
            return; 
         }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Alperez", "PetClean", "Techmovile"];
         setEmpresas(listaEmpresas);
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);

         if (activa && ajustesGuardados.perfiles && ajustesGuardados.perfiles[activa]) {
            setPerfilEmpresa(ajustesGuardados.perfiles[activa]);
         } else {
            setPerfilEmpresa({ sector: "No definido", objetivo: "No definido" });
         }

         if (activa) {
           fetch(`/api/finances?empresaId=${activa}&t=${Date.now()}`)
             .then(res => res.ok ? res.json() : [])
             .then(d => setAllData(d))
             .catch(err => console.error("Error cargando finanzas:", err));
         }
      });
  }, [isLoaded, isSignedIn, router]);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    setEmpresaId(nuevaEmpresa);
    setAiAnalysis("## Análisis Preliminar\nHas cambiado de empresa. Pulsa **Generar Nueva Auditoría** para analizar este nuevo espacio de trabajo.");
    
    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actuales, empresaActiva: nuevaEmpresa })
    });

    if (actuales.perfiles && actuales.perfiles[nuevaEmpresa]) {
       setPerfilEmpresa(actuales.perfiles[nuevaEmpresa]);
    } else {
       setPerfilEmpresa({ sector: "No definido", objetivo: "No definido" });
    }

    fetch(`/api/finances?empresaId=${nuevaEmpresa}&t=${Date.now()}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllData(d));
  };

  useEffect(() => {
    // Si no hay datos, limpiamos los gráficos para que no arrastren información vieja
    if (!allData || allData.length === 0) {
       setChartDataEvolucion([]); setChartDataGastos([]); setKpis({ ingresos: 0, gastos: 0, beneficio: 0, margen: 0 });
       return;
    }

    const ahora = new Date().getTime();
    
    // 🚀 LÓGICA DE FILTRADO CORREGIDA (Soporta formatos DD/MM/YYYY)
    const datosFiltrados = allData.filter(item => {
        if (filtroTiempo === 'all') return true;
        if (!item.name || !item.name.includes('/')) return false;

        const [d, m, y] = item.name.split('/');
        const fechaItem = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);
        
        if (filtroTiempo === 'month') return diffDias <= 30;
        if (filtroTiempo === 'quarter') return diffDias <= 90;
        if (filtroTiempo === 'year') return diffDias <= 365;
        return true;
    });

    let totalIngresos = 0;
    let totalGastos = 0;
    const mensualidades: Record<string, { Ingresos: number, Gastos: number, sortKey: number }> = {};
    const categoriasGastos: Record<string, number> = {};

    datosFiltrados.forEach(item => {
        const valor = Number(item.total);
        if (!item.name || !item.name.includes('/')) return;

        const [dia, mes, anio] = item.name.split('/');
        const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesLlave = `${nombresMeses[Number(mes) - 1]} ${anio}`;
        const sortKey = Number(anio) * 100 + Number(mes); 

        if (!mensualidades[mesLlave]) mensualidades[mesLlave] = { Ingresos: 0, Gastos: 0, sortKey };

        if (valor > 0) {
            totalIngresos += valor;
            mensualidades[mesLlave].Ingresos += valor;
        } else {
            const gastoAbsoluto = Math.abs(valor);
            totalGastos += gastoAbsoluto;
            mensualidades[mesLlave].Gastos += gastoAbsoluto;
            const cat = item.categoria || 'General';
            categoriasGastos[cat] = (categoriasGastos[cat] || 0) + gastoAbsoluto;
        }
    });

    const evolutionArray = Object.keys(mensualidades)
        .map(key => ({
            name: key,
            Ingresos: mensualidades[key].Ingresos,
            Gastos: mensualidades[key].Gastos,
            sortKey: mensualidades[key].sortKey
        }))
        .sort((a, b) => a.sortKey - b.sortKey); 

    const gastosArray = Object.keys(categoriasGastos).map(key => ({
        name: key,
        value: categoriasGastos[key]
    })).sort((a, b) => b.value - a.value); 

    setChartDataEvolucion(evolutionArray);
    setChartDataGastos(gastosArray);
    
    const beneficio = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? (beneficio / totalIngresos) * 100 : 0;
    
    setKpis({ ingresos: totalIngresos, gastos: totalGastos, beneficio: beneficio, margen: margen });
  }, [allData, filtroTiempo]);

  const generarAuditoria = async () => {
    if (allData.length === 0) {
      setAiAnalysis("⚠️ **Datos insuficientes.**\n\nNo hay transacciones en este Espacio de Trabajo. Por favor, añade ingresos o gastos en la Consola General para poder generar una auditoría.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis("⏳ **Conectando con el CFO Virtual...**\n\nAnalizando flujos de caja, identificando patrones de gasto y calculando proyecciones basadas en tu sector corporativo. Esto puede tardar unos segundos...");

    const datosLimpios = allData.map(d => ({
      fecha: d.name,
      categoria: d.categoria || 'General',
      importe: d.total,
      iva_aplicado: d.iva ? `${d.iva}%` : 'Exento',
      tipo: d.isRecurrent ? `Recurrente (${d.frecuencia})` : 'Puntual'
    }));

    const contextoEmpresarial = `Sector de la empresa: ${perfilEmpresa.sector || 'General'}. Objetivo Principal de la directiva: ${perfilEmpresa.objetivo || 'Estabilidad financiera'}.`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ data: datosLimpios, empresaId, contextoSector: contextoEmpresarial }), 
      });
      
      const textDecoded = await res.text();
      
      try {
         const json = JSON.parse(textDecoded);
         if (res.ok && json.analysis) {
            setAiAnalysis(json.analysis);
         } else {
            setAiAnalysis(`❌ **Error devuelto por la IA:**\n\n${json.error || "Fallo desconocido."}\n\n*Haz una captura de este mensaje y pásasela al soporte.*`);
         }
      } catch(parseError) {
         setAiAnalysis(`❌ **Error de Vercel (Timeout o Caída):**\n\nEl servidor ha tardado más de 10 segundos y ha abortado. \n\nRespuesta técnica:\n\`\`\`\n${textDecoded.substring(0, 150)}...\n\`\`\``);
      }
      
    } catch (error: any) {
      setAiAnalysis(`❌ **Error de conexión:** ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isMounted) return null;
  // 🚀 PANTALLA DE CARGA ELEGANTE PARA EVITAR PARPADEOS Y LECTURAS LENTAS
  if (planActivo === 'loading') {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Verificando nivel de acceso...</h2>
           <p className="text-sm font-medium text-slate-500 mb-6">Comprobando permisos del espacio de trabajo</p>
           
           <div className="flex gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></span>
           </div>
        </div>
     );
  }

  return (
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative text-slate-800" translate="no">
          
          {/* SIDEBAR MÓVIL Y ESCRITORIO IDÉNTICOS AL RESTO DE PÁGINAS */}
          <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
            <div className="flex items-center gap-2">
               <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-8 h-8 bg-white rounded-lg p-1 object-contain" />
               <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out`}>
            <div>
              <div className="flex items-center justify-between mb-10 px-2 mt-4 lg:mt-0">
                <div className="flex items-center gap-3">
                  <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-9 h-9 bg-white rounded-xl p-1 object-contain shadow-md shadow-blue-500/20" />
                  <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
                </div>
                <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="mb-6 px-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
                <select value={empresaId} onChange={(e) => cambiarEmpresa(e.target.value)} className="w-full mt-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 transition">
                    {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              
              <nav className="space-y-1">
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/impuestos" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Modelos Tributarios
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/facturas" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Facturación PDF
                </Link>
              </nav>
            </div>
            
            <div className="mt-auto">
              <Link href={planActivo === 'pro' || planActivo === 'autonomo' ? "#" : "/precios"} className={`w-full flex items-center justify-between p-3 rounded-2xl border mb-3 transition cursor-pointer ${planActivo === 'pro' || planActivo === 'autonomo' ? 'bg-emerald-900/20 border-emerald-900/50 hover:bg-emerald-900/40' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${planActivo === 'pro' || planActivo === 'autonomo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className={`text-xs font-bold ${planActivo === 'pro' || planActivo === 'autonomo' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {planActivo === 'pro' ? 'Plan Empresa PRO' : planActivo === 'autonomo' ? 'Plan Autónomo' : 'Suscripción Inactiva'}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${planActivo === 'pro' || planActivo === 'autonomo' ? 'text-emerald-300 bg-emerald-900/50' : 'text-slate-800 bg-white'}`}>
                  {planActivo === 'pro' || planActivo === 'autonomo' ? 'Activa' : 'Activar'}
                </span>
              </Link>
              
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
                <UserButton/>
              </div>
            </div>
          </aside>

          {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

          <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
            
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Evaluación financiera completa para <span className="font-bold text-blue-600">{empresaId}</span>.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                     {[
                         { id: 'all', label: 'Histórico' },
                         { id: 'year', label: '12 Meses' },
                         { id: 'quarter', label: '3 Meses' },
                         { id: 'month', label: '30 Días' }
                     ].map(f => (
                         <button 
                             key={f.id}
                             onClick={() => setFiltroTiempo(f.id)}
                             disabled={planActivo !== 'pro'} // Desactiva filtros si no es PRO
                             className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${filtroTiempo === f.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'} disabled:opacity-50`}
                         >
                             {f.label}
                         </button>
                     ))}
                 </div>

                 <button onClick={generarAuditoria} disabled={isAnalyzing || planActivo !== 'pro'} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md flex items-center justify-center gap-2">
                   {isAnalyzing ? "⏳ Procesando en IA..." : "✨ Generar Auditoría Inteligente"}
                 </button>
              </div>
            </header>

            {/* 🚀 AQUÍ ENTRA EL MURO DE PAGO (PAYWALL PARA EL AUTÓNOMO) */}
            {planActivo !== 'pro' ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8">
                 <div className="p-10 md:p-20 flex flex-col items-center justify-center text-center relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                       <span className="text-5xl">🔒</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
                       Módulo Premium
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Función Exclusiva Empresa Pro</h2>
                    <p className="text-base text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed font-medium">
                       El Análisis Avanzado con Inteligencia Artificial, los gráficos interactivos en tiempo real y la detección de fugas de capital están reservados para empresas con el Plan Pro.
                    </p>
                    <Link href="/precios" className="bg-blue-600 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition hover:-translate-y-1 flex items-center gap-2">
                       ⭐ Mejorar a Plan Empresa Pro
                    </Link>
                 </div>
              </div>
            ) : (
              /* 🚀 SI ES PRO, LE ENSEÑAMOS TODO EL CONTENIDO ORIGINAL */
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Ingresos</span>
                      <span className="text-2xl font-black text-slate-800">{kpis.ingresos.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                   </div>
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Gastos</span>
                      <span className="text-2xl font-black text-rose-500">{kpis.gastos.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                   </div>
                   <div className={`p-5 rounded-2xl border flex flex-col justify-center ${kpis.beneficio >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${kpis.beneficio >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Beneficio Neto</span>
                      <span className={`text-2xl font-black tracking-tight ${kpis.beneficio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {kpis.beneficio >= 0 ? '+' : ''}{kpis.beneficio.toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                      </span>
                   </div>
                   <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Margen Operativo</span>
                      <span className="text-2xl font-black text-blue-600">{kpis.margen.toFixed(1)}%</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                   <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px] xl:h-auto min-h-[450px]">
                      <div className="mb-6 flex items-center gap-2">
                         <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Evolución P&L (Mensual)</h3>
                      </div>
                      <div className="flex-1 w-full min-h-[300px]">
                         {chartDataEvolucion.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={chartDataEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={60} />
                                  <RechartsTooltip 
                                     cursor={{fill: '#f8fafc'}} 
                                     contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '12px' }}
                                     labelStyle={{ color: '#0f172a', fontWeight: '900', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px' }}
                                  />
                                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                                  <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                  <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                               </BarChart>
                            </ResponsiveContainer>
                         ) : (
                            <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">Sin datos en este periodo</div>
                         )}
                      </div>
                   </div>

                   <div className="xl:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-auto min-h-[450px]">
                      <div className="mb-2 flex items-center gap-2">
                         <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Distribución de Gastos</h3>
                      </div>
                      <div className="h-[220px] w-full relative">
                         {chartDataGastos.length > 0 ? (
                            <>
                               <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                     <Pie data={chartDataGastos} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                        {chartDataGastos.map((entry, index) => (
                                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                     </Pie>
                                     <RechartsTooltip 
                                        formatter={(value: number, name: string) => [`${value.toLocaleString('es-ES', {minimumFractionDigits: 2})} €`, name]}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                     />
                                  </PieChart>
                               </ResponsiveContainer>
                               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Costes</span>
                                  <span className="block text-lg font-black text-slate-800">{kpis.gastos > 1000 ? (kpis.gastos/1000).toFixed(1) + 'k' : kpis.gastos.toFixed(0)}€</span>
                               </div>
                            </>
                         ) : (
                            <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">Sin gastos registrados</div>
                         )}
                      </div>

                      {chartDataGastos.length > 0 && (
                         <div className="mt-6 space-y-4 border-t border-slate-100 pt-4 flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ranking de Costes</p>
                            {chartDataGastos.slice(0, 4).map((gasto, idx) => (
                               <div key={idx}>
                                  <div className="flex justify-between text-xs font-bold mb-1.5">
                                     <span className="text-slate-600 truncate mr-2">{gasto.name}</span>
                                     <span className="text-slate-900">{gasto.value.toLocaleString('es-ES')} €</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                                     <div className="h-1.5 rounded-full" style={{ width: `${Math.min((gasto.value / kpis.gastos) * 100, 100)}%`, backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-1 space-y-6">
                      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-6">
                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                            <h3 className="text-base md:text-lg font-black text-slate-900">Perfil Corporativo</h3>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mb-6 pb-4 border-b border-slate-100">
                            Contexto utilizado por la IA para enfocar el análisis estratégico. Configurable desde la Consola General.
                          </p>
                          <div className="space-y-6">
                              <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector Industrial</p>
                                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-semibold border border-slate-200">
                                      {perfilEmpresa.sector || "No definido"}
                                  </div>
                              </div>
                              <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Situación Actual / Objetivos</p>
                                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-semibold border border-slate-200">
                                      {perfilEmpresa.objetivo || "No definido"}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="xl:col-span-2">
                      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm h-full min-h-[400px]">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4 border-b border-slate-100 pb-6">
                              <div>
                                  <h2 className="text-xl md:text-2xl font-black text-slate-900">Documento Ejecutivo Confidencial</h2>
                                  <p className="text-xs font-bold text-blue-600 uppercase mt-2 tracking-wide">MOTOR DE IA | ENGINE TAXGUARDAI</p>
                              </div>
                              <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg border flex items-center gap-2 ${isAnalyzing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                  {isAnalyzing ? <><span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></span> PROCESANDO</> : <><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> INFORME LISTO</>}
                              </span>
                          </div>
                          
                          <div className="text-slate-700 prose prose-sm md:prose-base prose-slate prose-headings:font-black prose-h2:text-blue-900 prose-h3:text-slate-800 prose-p:text-slate-700 prose-p:font-medium prose-strong:text-slate-900 prose-li:font-medium max-w-none">
                              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                          </div>
                      </div>
                  </div>
                </div>
              </>
            )}
            <div className="h-10"></div>
          </main>
        </div>
      </Show>

      {/* RUTA DE ESCAPE PARA LOS NO REGISTRADOS */}
      <Show when="signed-out">
         <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center" translate="no">
            <div className="text-center">
               <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 mx-auto mb-6 shadow-2xl shadow-blue-500/20" />
               <h2 className="text-2xl font-black mb-4">Acceso Restringido</h2>
               <p className="text-slate-400 mb-8 max-w-sm">Esta es una zona privada para clientes de TaxGuard AI. Inicia sesión para continuar.</p>
               <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition">
                  Ir al Inicio
               </Link>
            </div>
         </div>
      </Show>
    </>
  );
}