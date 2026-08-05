"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useUser, UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { obtenerDatosSupabase, actualizarEstadoPago, obtenerEmpresasCliente, verificarRolUsuario } from '../actions';
import { obtenerAjustesSilencioso, obtenerAjustes, guardarAjustes } from '../../lib/settingsClient';
import { celdaCSVSegura } from '../../lib/csvExport';
import { Skeleton } from '@/components/ui/skeleton';
import EspacioTrabajoSelect from '../../components/EspacioTrabajoSelect';
import BannerModoAsesor from '../../components/BannerModoAsesor';
import SoporteVIPModal, { SoporteVIPNavButton } from '../../components/SoporteVIP';
import {
  esEspacioCliente,
  guardarEspacioSesion,
  limpiarEspacioSesion,
  resolverEspacioInicial,
  nombreEspacioVisible,
} from '../../lib/workspaceSession';

export default function DocumentosPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  
  // 🚀 ESTADOS GLOBALES DE LA APP
  const [data, setData] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [espaciosCliente, setEspaciosCliente] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState(""); 
  const [planActivo, setPlanActivo] = useState('loading');
  const [rolUsuario, setRolUsuario] = useState('LOADING');
  // 🚀 UX PREMIUM: evita pantallas en blanco/parpadeos mientras llegan los datos de Supabase
  const [isLoadingData, setIsLoadingData] = useState(true);
  // 🛡️ BLINDAJE DE ESTADO: ignora respuestas tardías si el usuario cambia de empresa muy rápido
  const empresaSolicitadaRef = useRef<string>("");
  
  // 🚀 ESTADOS DE LA PÁGINA DOCUMENTOS
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("ALL"); 
  
  // 🚀 ESTADOS DE UI (SIDEBAR Y MODALES)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const esLectura = rolUsuario === 'LECTURA';

  // 1️⃣ CARGAR AJUSTES Y EMPRESA ACTIVA (+ espacios asesor)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    obtenerEmpresasCliente().then(setEspaciosCliente);

    obtenerAjustesSilencioso()
      .then((ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         if (planDetectado === 'free') { router.push('/precios'); return; }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Mi Empresa"];
         setEmpresas(listaEmpresas);
         const activa = resolverEspacioInicial(ajustesGuardados.empresaActiva, listaEmpresas);
         setEmpresaId(activa);
         if (esEspacioCliente(activa)) guardarEspacioSesion(activa);
         else limpiarEspacioSesion();
      });
  }, [isLoaded, isSignedIn, router]);

  // 2️⃣ CARGAR DATOS + ROL CUANDO SABEMOS LA EMPRESA
  useEffect(() => {
    if (!empresaId) return;

    empresaSolicitadaRef.current = empresaId;
    setIsLoadingData(true);
    setRolUsuario('LOADING');

    verificarRolUsuario(empresaId).then((res) => {
      if (empresaSolicitadaRef.current !== empresaId) return;
      setRolUsuario(res.rol);
    });

    obtenerDatosSupabase(empresaId).then(d => {
      if (empresaSolicitadaRef.current !== empresaId) return;
      if (d && d.length > 0) setData(d);
      else setData([]);
      setIsLoadingData(false);
    });
  }, [empresaId]);

  // 🚀 FUNCIONES DEL SIDEBAR Y SOPORTE
  const cambiarEmpresa = async (newId: string) => {
    setEmpresaId(newId);
    if (esEspacioCliente(newId)) {
      guardarEspacioSesion(newId);
      return;
    }
    limpiarEspacioSesion();
    const actuales = await obtenerAjustes();
    if (!actuales) return;
    await guardarAjustes({ ...actuales, empresaActiva: newId });
  };

  const salirModoAsesor = async () => {
    limpiarEspacioSesion();
    const propia = empresas[0] || 'Mi Empresa';
    setEmpresaId(propia);
    const actuales = await obtenerAjustes();
    if (!actuales) return;
    await guardarAjustes({ ...actuales, empresaActiva: propia });
    toast.success('Modo Propietario', { description: 'Has vuelto a tu espacio personal.' });
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


  // 🚀 FUNCIONES DE LA TABLA
  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    const res = await actualizarEstadoPago(id, nuevoEstado, empresaId);
    if (res.success) {
      setData(data.map(item => item.id === id ? { ...item, estado_pago: nuevoEstado } : item));
    }
  };

  // 🚀 RENDIMIENTO: solo se recalcula cuando cambian los datos, la búsqueda o el filtro de estado
  // (antes se recalculaba en cada render, incluso al abrir/cerrar modales que no afectan a esta tabla)
  const documentosFiltrados = useMemo(() => {
    return data.filter(item => {
      const matchSearch = 
        (item.cliente_nombre?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.numero_factura?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.nombre_archivo?.toLowerCase() || "").includes(searchTerm.toLowerCase());
        
      const matchEstado = filtroEstado === "ALL" ? true : item.estado_pago === filtroEstado;

      return matchSearch && matchEstado;
    });
  }, [data, searchTerm, filtroEstado]);

  // 🚀 RENDIMIENTO: los widgets de morosidad solo dependen de "data", no de la búsqueda ni del
  // filtro de estado, así que se calculan aparte para no recalcularse en cada tecleo del buscador.
  const { facturasPendientes, dineroPendiente, recibosPendientes, dineroAPagar } = useMemo(() => {
    const ingresosPendientes = data.filter(d => d.estado_pago === "PENDIENTE" && Number(d.total) > 0);
    const gastosPendientes = data.filter(d => d.estado_pago === "PENDIENTE" && Number(d.total) < 0);

    return {
      facturasPendientes: ingresosPendientes.length,
      dineroPendiente: ingresosPendientes.reduce((acc, curr) => acc + (Math.abs(Number(curr.total)) * (1 + ((Number(curr.iva) || 0) / 100))), 0),
      recibosPendientes: gastosPendientes.length,
      dineroAPagar: gastosPendientes.reduce((acc, curr) => acc + (Math.abs(Number(curr.total)) * (1 + ((Number(curr.iva) || 0) / 100))), 0),
    };
  }, [data]);

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

      csvContent += `${celdaCSVSegura(doc)};${celdaCSVSegura(nif)};${item.name};${signo}${fNum(baseNum)};${ivaPorcentaje}%;${signo}${fNum(totalConIva)};${item.estado_pago};${celdaCSVSegura(archivo)}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Archivo_Documental_${empresaId}.csv`;
    link.click();
  };



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
                  <EspacioTrabajoSelect
                    empresaId={empresaId}
                    empresas={empresas}
                    espaciosCliente={espaciosCliente}
                    onChange={cambiarEmpresa}
                  />
                  {!esLectura && (
                    <button onClick={() => { toast.info("Configuración", { description: "Ve a la Consola General para configurar este espacio." }); router.push('/'); }} className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition border border-slate-700">⚙️</button>
                  )}
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

              <SoporteVIPNavButton onClick={() => { setShowSupportModal(true); setIsSidebarOpen(false); }} />
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
          {esLectura && (
            <BannerModoAsesor nombreCliente={nombreEspacioVisible(empresaId)} onSalir={salirModoAsesor} />
          )}
          <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Archivo y <span className="text-rose-600">Morosidad</span></h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Busca facturas pasadas y controla quién te debe dinero en <span className="font-bold text-blue-600">{nombreEspacioVisible(empresaId)}</span>.</p>
            </div>
            {/* WIDGET RADAR MOROSIDAD */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-5 shadow-sm">
                  <div>
                      <p className="text-[10px] font-black uppercase text-rose-800 tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Morosidad</p>
                      {isLoadingData ? <Skeleton className="h-3 w-28 mt-1.5" /> : <p className="text-[11px] font-medium text-rose-600 mt-0.5">{facturasPendientes} ingresos sin cobrar</p>}
                  </div>
                  <div className="text-right border-l border-rose-200 pl-4 min-w-[80px]">
                      {isLoadingData ? <Skeleton className="h-6 w-16 ml-auto" /> : <p className="text-xl font-black text-rose-600">{dineroPendiente.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>}
                  </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-5 shadow-sm">
                  <div>
                      <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">Cuentas por Pagar</p>
                      {isLoadingData ? <Skeleton className="h-3 w-28 mt-1.5" /> : <p className="text-[11px] font-medium text-amber-600 mt-0.5">{recibosPendientes} gastos sin pagar</p>}
                  </div>
                  <div className="text-right border-l border-amber-200 pl-4 min-w-[80px]">
                      {isLoadingData ? <Skeleton className="h-6 w-16 ml-auto" /> : <p className="text-xl font-black text-amber-600">{dineroAPagar.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>}
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
                  {isLoadingData && Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-10" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-24 ml-auto" /></td>
                    </tr>
                  ))}
                  {!isLoadingData && documentosFiltrados.map((item, idx) => {
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
                                  {!esLectura && (
                                    <button onClick={() => cambiarEstado(item.id, "COBRADO")} className={`text-xs font-bold hover:underline ${isGasto ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {isGasto ? 'Marcar Pagado ✓' : 'Marcar Cobrado ✓'}
                                    </button>
                                  )}
                              </div>
                          ) : (
                              <div className="flex items-center justify-end gap-3">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isGasto ? 'text-blue-700 bg-blue-50 border border-blue-200' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>
                                      {isGasto ? 'Pagado' : 'Cobrado'}
                                  </span>
                                  {!esLectura && (
                                    <button onClick={() => cambiarEstado(item.id, "PENDIENTE")} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:underline">
                                        Revertir
                                    </button>
                                  )}
                              </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoadingData && documentosFiltrados.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-sm font-bold text-slate-400">No hay documentos en este filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>

        <SoporteVIPModal open={showSupportModal} onClose={() => setShowSupportModal(false)} empresaId={nombreEspacioVisible(empresaId)} modulo="documentos" />

      </div>
    </Show>
    </>
  );
}