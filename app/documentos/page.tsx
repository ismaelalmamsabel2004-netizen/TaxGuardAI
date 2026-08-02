"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { obtenerDatosSupabase, actualizarEstadoPago } from '../actions';

export default function DocumentosPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  
  // 🚀 ESTADOS GLOBALES DE LA APP
  const [data, setData] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresaId, setEmpresaId] = useState(""); 
  const [planActivo, setPlanActivo] = useState('loading');
  
  // 🚀 ESTADOS DE LA PÁGINA DOCUMENTOS
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("ALL"); 
  
  // 🚀 ESTADOS DE UI (SIDEBAR Y MODALES)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 1️⃣ CARGAR AJUSTES Y EMPRESA ACTIVA
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         if (planDetectado === 'free') { router.push('/precios'); return; }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Mi Empresa"];
         setEmpresas(listaEmpresas);
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);
      });
  }, [isLoaded, isSignedIn, router]);

  // 2️⃣ CARGAR DATOS CUANDO SABEMOS LA EMPRESA (FILTRADO CORRECTO)
  useEffect(() => {
    if (!empresaId) return;

    obtenerDatosSupabase(empresaId).then(d => {
      if (d && d.length > 0) setData(d);
      else setData([]); // Si la empresa no tiene datos, vaciamos la tabla
    });
  }, [empresaId]);

  // 🚀 FUNCIONES DEL SIDEBAR Y SOPORTE
  const cambiarEmpresa = async (newId: string) => {
    setEmpresaId(newId);
    const res = await fetch('/api/settings');
    const actuales: any = await res.json(); 
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...actuales, empresaActiva: newId })
    });
  };

  const gestionarSuscripcion = async () => {
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
      const portalData = await res.json();
      if (portalData.url) window.location.href = portalData.url; 
      else toast.info("Modo Administrador", { description: "Activo sin tarjeta vinculada. A los clientes les cargará Stripe." });
    } catch (error) {
      toast.error("Error", { description: "Error de conexión con la pasarela." });
    }
  };

  const abrirGmailWeb = (tipo: string) => {
      const email = "soporte.taxguard@gmail.com";
      const subject = tipo === "ayuda" ? `Asistencia Técnica TaxGuard AI - ${empresaId}` : `Sugerencia de Mejora - TaxGuard AI - ${empresaId}`;
      const body = `Hola equipo de TaxGuard AI,%0A%0AEscribe aquí tu ${tipo === 'ayuda' ? 'consulta o problema' : 'idea para mejorar la plataforma'}:%0A%0A`;
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`, '_blank');
  };

  const copiarCorreoSoporte = () => {
      navigator.clipboard.writeText("soporte.taxguard@gmail.com");
      toast.success("Copiado", { description: "Correo de soporte copiado al portapapeles." });
  };

  // 🚀 FUNCIONES DE LA TABLA
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

  const ingresosPendientes = data.filter(d => d.estado_pago === "PENDIENTE" && Number(d.total) > 0);
  const facturasPendientes = ingresosPendientes.length;
  // 🚀 CORRECCIÓN CÁLCULO WIDGET SUPERIOR
  const dineroPendiente = ingresosPendientes.reduce((acc, curr) => acc + (Math.abs(Number(curr.total)) * (1 + ((Number(curr.iva) || 0) / 100))), 0);

  const gastosPendientes = data.filter(d => d.estado_pago === "PENDIENTE" && Number(d.total) < 0);
  const recibosPendientes = gastosPendientes.length;
  // 🚀 CORRECCIÓN CÁLCULO WIDGET SUPERIOR
  const dineroAPagar = gastosPendientes.reduce((acc, curr) => acc + (Math.abs(Number(curr.total)) * (1 + ((Number(curr.iva) || 0) / 100))), 0);

  const exportarAExcel = () => {
    if (documentosFiltrados.length === 0) return toast.info("Sin datos", { description: "No hay datos para exportar en este filtro." });
    
    let csvContent = "\uFEFFDocumento;NIF;Fecha;Base Imponible;IVA;Total Operacion;Estado;Archivo\n";
    
    documentosFiltrados.forEach(item => {
      const isGasto = Number(item.total) < 0;
      const baseNum = Math.abs(Number(item.total));
      const ivaPorcentaje = Number(item.iva) || 0;
      const cuotaIva = baseNum * (ivaPorcentaje / 100);
      const totalConIva = baseNum + cuotaIva;
      
      const signo = isGasto ? "-" : "+";
      const doc = item.cliente_nombre || item.concepto_detalle || "Factura";
      const nif = item.cliente_nif || "S/N";
      const fNum = (num: number) => num.toFixed(2).replace('.', ',');
      const archivo = item.url_archivo || "Sin adjunto";

      csvContent += `${doc};${nif};${item.name};${signo}${fNum(baseNum)};${ivaPorcentaje}%;${signo}${fNum(totalConIva)};${item.estado_pago};${archivo}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Archivo_Documental_${empresaId}.csv`;
    link.click();
  };


  const faqs = [
      { q: "🚀 ¿Cómo empiezo a usar TaxGuard AI por primera vez?", a: "Crea tu empresa arriba a la izquierda y pulsa la rueda dentada (⚙️) para añadir tus categorías." },
      { q: "📸 ¿Cómo funciona el escáner de facturas con IA (OCR)?", a: "Sube una foto o PDF en la Consola General. La IA extraerá los datos automáticamente." },
      { q: "🚨 ¿Qué es el Radar de Morosidad?", a: "Es esta misma pantalla. Aquí puedes controlar las facturas que has emitido y marcar las que te han pagado o las que te deben." }
  ];
  const faqsFiltradas = faqs.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()));

  if (!isLoaded || planActivo === 'loading') return <div className="min-h-screen bg-[#F4F5F7] animate-pulse"></div>;

  return (
    <>
    <Toaster position="bottom-right" richColors theme="light" />
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
        
        {/* 🚀 SIDEBAR MÓVIL (TOP BAR) */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
          <div className="flex items-center gap-2">
             <img src="/icon-192x192.png" alt="Logo" className="w-8 h-8 bg-white rounded-lg p-1 object-contain" />
             <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        {/* 🚀 SIDEBAR PRINCIPAL UNIFICADO */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out`}>
          <div>
            <div className="flex items-center justify-between mb-10 px-2 mt-4 lg:mt-0">
              <div className="flex items-center gap-3">
                <img src="/icon-192x192.png" alt="Logo" className="w-9 h-9 bg-white rounded-xl p-1 object-contain shadow-md" />
                <h2 className="text-xl font-black text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></h2>
              </div>
              <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* SELECTOR DE EMPRESA */}
            <div className="mb-6 px-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
              <div className="flex gap-2 mt-1">
                  <select 
                    value={empresaId} 
                    onChange={(e) => cambiarEmpresa(e.target.value)} 
                    className="w-full bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none truncate"
                  >
                      {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {/* Botones redirigen a Consola General para evitar duplicar código de modales */}
                  <button onClick={() => { toast.info("Configuración", { description: "Ve a la Consola General para configurar este espacio." }); router.push('/'); }} className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition border border-slate-700">⚙️</button>
              </div>
            </div>
            
            <nav className="space-y-1">
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                Consola General
              </Link>
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2h-2a2 2 0 01-2-2z"/></svg>
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
              <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/documentos" onClick={() => setIsSidebarOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                Gestor Documental
              </Link>

              <div className="pt-4 mt-4 border-t border-slate-800">
                  <button onClick={() => {setShowSupportModal(true); setIsSidebarOpen(false);}} className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition group">
                    <span className="text-lg group-hover:scale-110 transition-transform">🎧</span> Soporte VIP
                  </button>
              </div>
            </nav>
          </div>
          
          <div className="mt-auto">
            {planActivo === 'pro' || planActivo === 'autonomo' ? (
              <button onClick={gestionarSuscripcion} className="w-full flex items-center justify-between p-3 rounded-2xl border mb-3 transition cursor-pointer bg-emerald-900/20 border-emerald-900/50 hover:bg-emerald-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-500"></span>
                  <span className="text-xs font-bold text-emerald-400">{planActivo === 'pro' ? 'Plan Empresa PRO' : 'Plan Autónomo'}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md text-emerald-300 bg-emerald-900/50 hover:bg-emerald-800/80 transition">Gestionar</span>
              </button>
            ) : null}
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
              <UserButton/>
            </div>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* 🚀 MAIN CONTENT */}
        <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
          <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Archivo y <span className="text-rose-600">Morosidad</span></h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Busca facturas pasadas y controla quién te debe dinero en <span className="font-bold text-blue-600">{empresaId}</span>.</p>
            </div>
            {/* WIDGET RADAR MOROSIDAD */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-5 shadow-sm">
                  <div>
                      <p className="text-[10px] font-black uppercase text-rose-800 tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Morosidad</p>
                      <p className="text-[11px] font-medium text-rose-600 mt-0.5">{facturasPendientes} ingresos sin cobrar</p>
                  </div>
                  <div className="text-right border-l border-rose-200 pl-4 min-w-[80px]">
                      <p className="text-xl font-black text-rose-600">{dineroPendiente.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>
                  </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-5 shadow-sm">
                  <div>
                      <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">Cuentas por Pagar</p>
                      <p className="text-[11px] font-medium text-amber-600 mt-0.5">{recibosPendientes} gastos sin pagar</p>
                  </div>
                  <div className="text-right border-l border-amber-200 pl-4 min-w-[80px]">
                      <p className="text-xl font-black text-amber-600">{dineroAPagar.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>
                  </div>
              </div>
            </div>
          </header>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                {/* 🚀 CORRECCIÓN COLOR BUSCADOR */}
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por nombre, NIF o Nº factura..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-96 p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                />
                <div className="flex gap-2 w-full sm:w-auto bg-slate-200/50 p-1.5 rounded-xl">
                    <button onClick={exportarAExcel} className="hidden lg:block px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition shadow-sm mr-2">↓ Descargar CSV</button>
                    <button onClick={() => setFiltroEstado("ALL")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filtroEstado === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
                    <button onClick={() => setFiltroEstado("PENDIENTE")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filtroEstado === 'PENDIENTE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}>Pendientes</button>
                    <button onClick={() => setFiltroEstado("COBRADO")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filtroEstado === 'COBRADO' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>Completadas</button>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Documento / Cliente</th>
                    <th className="px-6 py-4">Fecha Op.</th>
                    <th className="px-6 py-4">Base Imponible</th>
                    <th className="px-6 py-4">IVA</th>
                    <th className="px-6 py-4">Total Operación</th>
                    <th className="px-6 py-4 text-center">Archivo</th>
                    <th className="px-6 py-4 text-right">Estado Financiero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {documentosFiltrados.map((item, idx) => {
                    const isGasto = Number(item.total) < 0;
                    const isPresupuesto = item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-');
                    const isAbono = item.numero_factura?.startsWith('R-');
                    
                    const baseNum = Math.abs(item.total);
                    const ivaPorcentaje = Number(item.iva) || 0;
                    const cuotaIva = baseNum * (ivaPorcentaje / 100);
                    const totalConIva = baseNum + cuotaIva;

                    const signoOperacion = isPresupuesto ? '+' : (isGasto || isAbono ? '-' : '+');
                    const colorSigno = isPresupuesto ? 'text-amber-600' : (isGasto || isAbono ? 'text-rose-600' : 'text-emerald-600');

                    // 🚨 Alerta visual si la factura pendiente tiene más de 30 días
                    const [d, m, y] = item.name.split('/');
                    const fechaEmision = new Date(Number(y), Number(m)-1, Number(d)).getTime();
                    const diasDesdeEmision = (new Date().getTime() - fechaEmision) / (1000 * 3600 * 24);
                    const isVencida = item.estado_pago === 'PENDIENTE' && diasDesdeEmision > 30;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.cliente_nombre || item.concepto_detalle || "Factura / Ticket"}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                            {item.numero_factura ? `Nº: ${item.numero_factura} | ` : ""} {item.categoria || 'General'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">
                           {item.name}
                           {isVencida && <span title="¡Documento vencido (+30 días)!" className="ml-2 text-rose-500 animate-pulse text-base cursor-help">🚨</span>}
                        </td>
                        
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {baseNum.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200">
                              {ivaPorcentaje === 0 ? "Exento" : `+${cuotaIva.toLocaleString('es-ES', {minimumFractionDigits: 2})} € (${ivaPorcentaje}%)`}
                           </span>
                        </td>
                        <td className={`px-6 py-4 font-black ${colorSigno}`}>
                          {signoOperacion}{totalConIva.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                        </td>

                        <td className="px-6 py-4 text-center">
                          {item.url_archivo ? (
                              <a href={item.url_archivo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition shadow-sm">
                                  📎 Ver Doc
                              </a>
                          ) : (
                              <span className="text-slate-300 text-xs italic">Sin adjunto</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.estado_pago === "PENDIENTE" ? (
                              <div className="flex items-center justify-end gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isGasto ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-rose-600 bg-rose-50 border border-rose-200 animate-pulse'}`}>
                                      {isGasto ? 'Por Pagar' : 'Pendiente Cobro'}
                                  </span>
                                  <button onClick={() => cambiarEstado(item.id, "COBRADO")} className={`text-xs font-bold hover:underline ${isGasto ? 'text-blue-600' : 'text-emerald-600'}`}>
                                      {isGasto ? 'Marcar Pagado ✓' : 'Marcar Cobrado ✓'}
                                  </button>
                              </div>
                          ) : (
                              <div className="flex items-center justify-end gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isGasto ? 'text-blue-700 bg-blue-50 border border-blue-200' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>
                                      {isGasto ? 'Pagado' : 'Cobrado'}
                                  </span>
                                  <button onClick={() => cambiarEstado(item.id, "PENDIENTE")} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:underline">
                                      Revertir
                                  </button>
                              </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {documentosFiltrados.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-sm font-bold text-slate-400">No hay documentos en este filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>

        {/* 🚀 MODAL DE SOPORTE VIP UNIFICADO */}
        {showSupportModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" translate="no">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">🎧 Centro de Soporte VIP</h3>
                  <button onClick={() => setShowSupportModal(false)} className="text-slate-400 hover:text-rose-500 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="p-6 space-y-8 overflow-y-auto bg-slate-50/30">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button onClick={() => abrirGmailWeb('ayuda')} className="p-5 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition group flex flex-col items-start text-left shadow-sm">
                           <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📨</span>
                           <h4 className="text-sm font-black text-blue-900 mb-1">Contactar a Soporte</h4>
                           <p className="text-xs text-blue-700 font-medium">Resolvemos tus dudas en menos de 24h laborables.</p>
                       </button>
                       <button onClick={() => abrirGmailWeb('sugerencia')} className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition group flex flex-col items-start text-left shadow-sm">
                           <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">💡</span>
                           <h4 className="text-sm font-black text-emerald-900 mb-1">Buzón de Sugerencias</h4>
                           <p className="text-xs text-emerald-700 font-medium">¿Echas en falta alguna función? Escríbenos.</p>
                       </button>
                   </div>
                   
                   <div className="flex justify-center">
                       <button onClick={copiarCorreoSoporte} className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Copiar correo (soporte.taxguard@gmail.com)
                       </button>
                   </div>

                   <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">📚 Base de Conocimiento</h4>
                          <input type="text" placeholder="Buscar..." value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none w-full sm:w-64" />
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                         {faqsFiltradas.length === 0 ? (
                             <p className="text-center text-xs text-slate-400 py-4">Sin resultados.</p>
                         ) : (
                             faqsFiltradas.map((faq, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                                   <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 transition">
                                      <span className="text-xs font-bold text-slate-700 pr-4">{faq.q}</span>
                                      <span className={`text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}>▼</span>
                                   </button>
                                   {openFaq === idx && <div className="p-4 pt-0 text-[11px] text-slate-500 leading-relaxed bg-white border-t border-slate-100">{faq.a}</div>}
                                </div>
                             ))
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
    </Show>
    </>
  );
}