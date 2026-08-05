"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useUser, UserButton, Show, SignInButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';

import { obtenerDatosSupabase } from '../actions';
import { obtenerAjustesSilencioso, obtenerAjustes, guardarAjustes } from '../../lib/settingsClient';
import { Skeleton } from '@/components/ui/skeleton';

function contarPerceptores(lista: { cliente_nombre?: string; concepto_detalle?: string }[]) {
  const nombres = new Set(
    lista
      .map((d) => (d.cliente_nombre || d.concepto_detalle || "").trim().toLowerCase())
      .filter(Boolean)
  );
  return nombres.size || lista.length;
}

// 🚀 RENDIMIENTO: @react-pdf/renderer se carga en su propio chunk, solo en el navegador y solo
// cuando el botón de descarga llega a pintarse, para no lastrar el JS inicial de esta página.
const ModelosTributariosPDFButton = dynamic(() => import('../../components/pdf/ModelosTributariosPDFButton'), {
  ssr: false,
  loading: () => <button disabled className="w-full sm:w-auto bg-slate-300 text-slate-500 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-50">⏳ Preparando PDF...</button>
});

export default function ModelosTributarios() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  // 🚀 UX PREMIUM: evita pantallas en blanco/parpadeos en los modelos fiscales mientras llegan los datos
  const [isLoadingData, setIsLoadingData] = useState(true);
  // 🛡️ BLINDAJE DE ESTADO: ignora respuestas tardías si el usuario cambia de empresa muy rápido
  const empresaSolicitadaRef = useRef<string>("");

  const [planActivo, setPlanActivo] = useState('loading');

  const [trimestre, setTrimestre] = useState("1T");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [aniosDisponibles, setAniosDisponibles] = useState<string[]>([new Date().getFullYear().toString()]);
  
  const [modeloActivo, setModeloActivo] = useState<"303" | "130" | "390" | "115" | "111" | "347" | "349">("303");

  // 🚀 ESTADOS PARA EL MODAL DE SOPORTE
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // 🗓️ CALENDARIO AEAT: durante la ventana de presentación (días 1–20 de ene/abr/jul/oct)
    // abrimos el trimestre que toca presentar, no el trimestre civil en curso. Así, en abril
    // el usuario ve el 1T (el que vence el día 20) en vez del 2T vacío.
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const diaActual = ahora.getDate();
    const anioActual = ahora.getFullYear();

    if (mesActual === 1 && diaActual <= 20) {
      setTrimestre("4T");
      setAnio((anioActual - 1).toString());
    } else if (mesActual === 4 && diaActual <= 20) {
      setTrimestre("1T");
    } else if (mesActual === 7 && diaActual <= 20) {
      setTrimestre("2T");
    } else if (mesActual === 10 && diaActual <= 20) {
      setTrimestre("3T");
    } else if (mesActual <= 3) setTrimestre("1T");
    else if (mesActual <= 6) setTrimestre("2T");
    else if (mesActual <= 9) setTrimestre("3T");
    else setTrimestre("4T");

    if (!isLoaded) return;
    if (!isSignedIn) return;

    obtenerAjustesSilencioso()
      .then((ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         if (planDetectado === 'free') { router.push('/precios'); return; }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Alperez"];
         setEmpresas(listaEmpresas);
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         empresaSolicitadaRef.current = activa;
         setEmpresaId(activa);

         if (activa) {
           setIsLoadingData(true);
           obtenerDatosSupabase(activa).then(d => {
                if (empresaSolicitadaRef.current !== activa) return; // Respuesta obsoleta: ya se cambió de empresa
                setData(d);
                if (d.length > 0) {
                    const aniosUnicos = new Set<string>();
                    d.forEach((item: any) => {
                        const [, , year] = item.name.split('/');
                        if (year) aniosUnicos.add(year);
                    });
                    aniosUnicos.add(new Date().getFullYear().toString());
                    setAniosDisponibles(Array.from(aniosUnicos).sort((a, b) => Number(b) - Number(a)));
                }
                setIsLoadingData(false);
           }).catch(() => { if (empresaSolicitadaRef.current === activa) setIsLoadingData(false); });
         } else {
           setIsLoadingData(false);
         }
      });
  }, [isLoaded, isSignedIn, router]);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    const actuales = await obtenerAjustes();
    if (!actuales) return; // 🛡️ Sin conexión: abortamos para no pisar los ajustes reales de la nube.
    empresaSolicitadaRef.current = nuevaEmpresa;
    setEmpresaId(nuevaEmpresa);
    await guardarAjustes({ ...actuales, empresaActiva: nuevaEmpresa });

    setIsLoadingData(true);
    obtenerDatosSupabase(nuevaEmpresa).then(d => {
          if (empresaSolicitadaRef.current !== nuevaEmpresa) return; // Respuesta obsoleta: ya se cambió de empresa
          setData(d);
          if (d.length > 0) {
              const aniosUnicos = new Set<string>();
              d.forEach((item: any) => {
                  const [, , year] = item.name.split('/');
                  if (year) aniosUnicos.add(year);
              });
              aniosUnicos.add(new Date().getFullYear().toString());
              setAniosDisponibles(Array.from(aniosUnicos).sort((a, b) => Number(b) - Number(a)));
          }
          setIsLoadingData(false);
    }).catch(() => { if (empresaSolicitadaRef.current === nuevaEmpresa) setIsLoadingData(false); });
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

  // 🚀 RENDIMIENTO: los modelos fiscales se recalculaban TODOS en cada render aunque el usuario
  // solo viera uno (`modeloActivo`). Se memoizan para que solo se vuelvan a calcular cuando
  // cambian los datos, el año o el trimestre.
  const datosValidos = useMemo(() => data.filter(d => d.categoria !== "Presupuestos"), [data]);

  const mod303 = useMemo(() => {
    const datosTrimestre = datosValidos.filter(d => {
      if (!d.name || !d.name.includes('/')) return false;
      const [, mesStr, anioStr] = d.name.split('/');
      if (anioStr !== anio) return false;
      
      const m = Number(mesStr);
      if (trimestre === '1T') return m >= 1 && m <= 3;
      if (trimestre === '2T') return m >= 4 && m <= 6;
      if (trimestre === '3T') return m >= 7 && m <= 9;
      if (trimestre === '4T') return m >= 10 && m <= 12;
      return false;
    });

    const ingresos = datosTrimestre.filter(d => Number(d.total) > 0);
    const gastos = datosTrimestre.filter(d => Number(d.total) < 0);

    const base21 = ingresos.filter(i => Number(i.iva) === 21).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuota21 = base21 * 0.21;
    const base10 = ingresos.filter(i => Number(i.iva) === 10).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuota10 = base10 * 0.10;
    const base4 = ingresos.filter(i => Number(i.iva) === 4).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuota4 = base4 * 0.04;
    const totalCuotaDevengada = cuota21 + cuota10 + cuota4;

    const baseDeducible = gastos.reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuotaDeducible = gastos.reduce((acc, curr) => {
       const tipoIva = Number(curr.iva) || 0;
       return acc + (Math.abs(Number(curr.total)) * (tipoIva / 100));
    }, 0);

    return { base21, cuota21, base10, cuota10, base4, cuota4, totalCuotaDevengada, baseDeducible, cuotaDeducible, resultado: totalCuotaDevengada - cuotaDeducible };
  }, [datosValidos, anio, trimestre]);

  const mod130 = useMemo(() => {
    const datosAcumulados = datosValidos.filter(d => {
      if (!d.name || !d.name.includes('/')) return false;
      const [, mesStr, anioStr] = d.name.split('/');
      if (anioStr !== anio) return false;

      const m = Number(mesStr);
      let maxMes = 3;
      if (trimestre === '2T') maxMes = 6;
      if (trimestre === '3T') maxMes = 9;
      if (trimestre === '4T') maxMes = 12;

      return m >= 1 && m <= maxMes;
    });

    const ingresosTotales = datosAcumulados.filter(d => Number(d.total) > 0).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const gastosTotales = datosAcumulados.filter(d => Number(d.total) < 0).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);

    const rendimientoNeto = ingresosTotales - gastosTotales;
    let pagoFraccionado = 0;
    if (rendimientoNeto > 0) pagoFraccionado = rendimientoNeto * 0.20; 

    return { ingresosTotales, gastosTotales, rendimientoNeto, pagoFraccionado };
  }, [datosValidos, anio, trimestre]);

  const mod390 = useMemo(() => {
    const datosAnio = datosValidos.filter(d => {
      if (!d.name || !d.name.includes('/')) return false;
      const [, , anioStr] = d.name.split('/');
      return anioStr === anio;
    });

    const ingresos = datosAnio.filter(d => Number(d.total) > 0);
    const gastos = datosAnio.filter(d => Number(d.total) < 0);

    const base21 = ingresos.filter(i => Number(i.iva) === 21).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuota21 = base21 * 0.21;
    const base10 = ingresos.filter(i => Number(i.iva) === 10).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuota10 = base10 * 0.10;
    const base4 = ingresos.filter(i => Number(i.iva) === 4).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuota4 = base4 * 0.04;
    const base0 = ingresos.filter(i => Number(i.iva) === 0).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    
    const totalIngresos = base21 + base10 + base4 + base0;
    const totalCuotaDevengada = cuota21 + cuota10 + cuota4;

    const baseGastos = gastos.reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuotaGastos = gastos.reduce((acc, curr) => {
       const tipoIva = Number(curr.iva) || 0;
       return acc + (Math.abs(Number(curr.total)) * (tipoIva / 100));
    }, 0);

    return { 
        base21, cuota21, base10, cuota10, base4, cuota4, base0, 
        totalIngresos, totalCuotaDevengada, 
        baseGastos, cuotaGastos, 
        resultadoAnual: totalCuotaDevengada - cuotaGastos 
    };
  }, [datosValidos, anio]);

  // Filtra gastos del trimestre activo (reutilizado por 115 y 111)
  const gastosTrimestre = useMemo(() => {
    return datosValidos.filter(d => {
      if (!d.name || !d.name.includes('/')) return false;
      const [, mesStr, anioStr] = d.name.split('/');
      if (anioStr !== anio) return false;
      if (!(Number(d.total) < 0)) return false;
      const m = Number(mesStr);
      if (trimestre === '1T') return m >= 1 && m <= 3;
      if (trimestre === '2T') return m >= 4 && m <= 6;
      if (trimestre === '3T') return m >= 7 && m <= 9;
      if (trimestre === '4T') return m >= 10 && m <= 12;
      return false;
    });
  }, [datosValidos, anio, trimestre]);

  // Modelo 115: SOLO retenciones de alquiler / arrendamiento (19%)
  const mod115 = useMemo(() => {
    const gastosAlquiler = gastosTrimestre.filter((d) => {
      const cat = (d.categoria || "").toLowerCase();
      return cat.includes("alquiler") || cat.includes("arrendamiento");
    });
    const baseRetencion = gastosAlquiler.reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const totalRetencion = baseRetencion * 0.19;
    return {
      baseRetencion,
      totalRetencion,
      numPerceptores: contarPerceptores(gastosAlquiler),
    };
  }, [gastosTrimestre]);

  // Modelo 111: retenciones de profesionales / asesores (15%)
  const mod111 = useMemo(() => {
    const gastosProf = gastosTrimestre.filter((d) => {
      const cat = (d.categoria || "").toLowerCase();
      return (
        cat.includes("profesional") ||
        cat.includes("asesor") ||
        cat.includes("abogad") ||
        cat.includes("consultor") ||
        cat.includes("autonomo") ||
        cat.includes("autónomo")
      );
    });
    const baseRetencion = gastosProf.reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const totalRetencion = baseRetencion * 0.15;
    return {
      baseRetencion,
      totalRetencion,
      numPerceptores: contarPerceptores(gastosProf),
    };
  }, [gastosTrimestre]);

  // Calendario fiscal: próximos vencimientos AEAT
  const proximosVencimientos = useMemo(() => {
    const hoy = new Date();
    const base = [
      { modelo: "303 / 130 / 111 / 115", etiqueta: "1T", mes: 4, dia: 20 },
      { modelo: "303 / 130 / 111 / 115", etiqueta: "2T", mes: 7, dia: 20 },
      { modelo: "303 / 130 / 111 / 115", etiqueta: "3T", mes: 10, dia: 20 },
      { modelo: "303 / 130 / 111 / 115", etiqueta: "4T", mes: 1, dia: 20 },
      { modelo: "390 / 190 / 180", etiqueta: "Resúmenes anuales", mes: 1, dia: 30 },
      { modelo: "100", etiqueta: "Renta anual", mes: 6, dia: 30 },
    ];
    return base
      .map((v) => {
        let yearV = hoy.getFullYear();
        let fecha = new Date(yearV, v.mes - 1, v.dia, 23, 59, 59);
        if (fecha < hoy) {
          yearV += 1;
          fecha = new Date(yearV, v.mes - 1, v.dia, 23, 59, 59);
        }
        const diasRestantes = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return { ...v, fecha, yearV, diasRestantes };
      })
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .slice(0, 3);
  }, []);

  const mod347 = useMemo(() => {
    const datosAnio = datosValidos.filter(d => {
      if (!d.name || !d.name.includes('/')) return false;
      const [, , anioStr] = d.name.split('/');
      return anioStr === anio;
    });

    const operacionesTerceros: Record<string, number> = {};
    datosAnio.forEach(d => {
       const tercero = d.cliente_nombre || d.concepto_detalle || d.categoria || "Tercero Genérico";
       operacionesTerceros[tercero] = (operacionesTerceros[tercero] || 0) + Math.abs(Number(d.total));
    });

    const superan3005 = Object.keys(operacionesTerceros)
       .map(k => ({ nombre: k, importe: operacionesTerceros[k] }))
       .filter(op => op.importe >= 3005.06)
       .sort((a,b) => b.importe - a.importe);
    
    return { detalle: superan3005 };
  }, [datosValidos, anio]);

  const mod349 = useMemo(() => {
    const datosTrimestre = datosValidos.filter(d => {
      if (!d.name || !d.name.includes('/')) return false;
      const [, mesStr, anioStr] = d.name.split('/');
      if (anioStr !== anio) return false;
      const m = Number(mesStr);
      if (trimestre === '1T') return m >= 1 && m <= 3;
      if (trimestre === '2T') return m >= 4 && m <= 6;
      if (trimestre === '3T') return m >= 7 && m <= 9;
      if (trimestre === '4T') return m >= 10 && m <= 12;
      return false;
    });

    const operacionesIntra = datosTrimestre.filter(d => Number(d.iva) === 0 && d.categoria !== "Nóminas" && d.categoria !== "Impuestos" && d.categoria !== "Otros");
    const entregas = operacionesIntra.filter(d => Number(d.total) > 0).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const adquisiciones = operacionesIntra.filter(d => Number(d.total) < 0).reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    
    return { entregas, adquisiciones };
  }, [datosValidos, anio, trimestre]);

  const faqs = [
    { q: "🏛️ ¿Me sirven estos borradores para presentarlos en la AEAT?", a: "Son borradores orientativos con casillas alineadas al formulario de la AEAT ([01], [03], etc.). Revísalos con tu asesor antes de presentarlos: TaxGuard no sustituye la declaración oficial ni la firma electrónica." },
    { q: "🧾 ¿Qué gastos coge el modelo 130?", a: "El modelo 130 acumula TODOS tus gastos e ingresos (sin IVA) desde Enero hasta el trimestre seleccionado, para calcular tu rendimiento neto real." },
    { q: "🏢 ¿Cuál es la diferencia entre el 115 y el 111?", a: "El Modelo 115 es solo para retenciones de alquileres (19%). El Modelo 111 es para retenciones a profesionales y asesores (15%). TaxGuard los separa según la categoría del gasto." },
    { q: "🚨 ¿Para qué sirve el modelo 347?", a: "Hacienda obliga a declarar qué clientes o proveedores te han facturado (o tú a ellos) más de 3.005,06€ en total durante todo el año. TaxGuard suma todas las facturas y te los agrupa automáticamente." }
  ];
  const faqsFiltradas = faqs.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()));

  if (!isMounted) return null;

  if (planActivo === 'loading' && isSignedIn) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Verificando nivel de acceso...</h2>
           <p className="text-sm font-medium text-slate-500 mb-6">Comprobando permisos del espacio de trabajo</p>
           
           <div className="bg-slate-900/50 border border-slate-800 px-4 py-2.5 rounded-xl mb-8 flex items-center gap-3 shadow-lg">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Soporte Técnico VIP</p>
                <p className="text-sm font-bold text-blue-400">soporte.taxguard@gmail.com</p>
              </div>
           </div>

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
      <Toaster position="bottom-right" richColors theme="light" />
      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative text-slate-800" translate="no">
          
          <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
            <div className="flex items-center gap-2">
               <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-8 h-8 bg-white rounded-lg p-1 object-contain" />
               <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          {/* 🚀 SIDEBAR UNIFICADO */}
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
                <div className="flex gap-2 mt-1">
                    <select 
                      value={empresaId} 
                      onChange={(e) => cambiarEmpresa(e.target.value)} 
                      className="w-full bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none truncate"
                    >
                        {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/impuestos" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Modelos Tributarios
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/facturas" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Facturación PDF
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/documentos" onClick={() => setIsSidebarOpen(false)}>
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
              <Link href={planActivo === 'pro' || planActivo === 'autonomo' ? "#" : "/precios"} onClick={planActivo === 'pro' || planActivo === 'autonomo' ? gestionarSuscripcion : undefined} className={`w-full flex items-center justify-between p-3 rounded-2xl border mb-3 transition cursor-pointer ${planActivo === 'pro' || planActivo === 'autonomo' ? 'bg-emerald-900/20 border-emerald-900/50 hover:bg-emerald-900/40' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${planActivo === 'pro' || planActivo === 'autonomo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className={`text-xs font-bold ${planActivo === 'pro' || planActivo === 'autonomo' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {planActivo === 'pro' ? 'Plan Empresa PRO' : planActivo === 'autonomo' ? 'Plan Autónomo' : 'Suscripción Inactiva'}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${planActivo === 'pro' || planActivo === 'autonomo' ? 'text-emerald-300 bg-emerald-900/50' : 'text-slate-800 bg-white'}`}>
                  {planActivo === 'pro' || planActivo === 'autonomo' ? 'Gestionar' : 'Activar'}
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
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modelos Oficiales</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Gestión fiscal inteligente lista para presentar en Hacienda.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 {/* Selector de trimestre oculto para los anuales 390 y 347 */}
                 {(modeloActivo !== '390' && modeloActivo !== '347') && (
                   <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                      {['1T', '2T', '3T', '4T'].map(t => (
                         <button 
                            key={t}
                            onClick={() => setTrimestre(t)}
                            disabled={planActivo !== 'pro'}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${trimestre === t ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'} disabled:opacity-50`}
                         >
                            {t}
                         </button>
                      ))}
                   </div>
                 )}
                 
                 <select 
                   value={anio} 
                   onChange={(e) => setAnio(e.target.value)}
                   disabled={planActivo !== 'pro'}
                   className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm outline-none disabled:opacity-50"
                 >
                   {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>

                 {/* BOTONES DE DESCARGA DINÁMICOS */}
                 {planActivo === 'pro' && isMounted ? (
                    <ModelosTributariosPDFButton
                       modeloActivo={modeloActivo}
                       datosModelo={
                          modeloActivo === '303' ? mod303 :
                          modeloActivo === '130' ? mod130 :
                          modeloActivo === '390' ? mod390 :
                          modeloActivo === '115' ? mod115 :
                          modeloActivo === '111' ? mod111 :
                          modeloActivo === '347' ? mod347 : mod349
                       }
                       empresaId={empresaId}
                       trimestre={trimestre}
                       anio={anio}
                       fileName={
                          modeloActivo === '303' ? `Modelo303_Borrador_${empresaId.replace(/\s+/g, '')}_${trimestre}_${anio}.pdf` :
                          modeloActivo === '130' ? `Modelo130_Borrador_${empresaId.replace(/\s+/g, '')}_${trimestre}_${anio}.pdf` :
                          modeloActivo === '390' ? `Modelo390_Anual_${empresaId.replace(/\s+/g, '')}_${anio}.pdf` :
                          modeloActivo === '115' ? `Modelo115_Borrador_${empresaId.replace(/\s+/g, '')}_${trimestre}_${anio}.pdf` :
                          modeloActivo === '111' ? `Modelo111_Borrador_${empresaId.replace(/\s+/g, '')}_${trimestre}_${anio}.pdf` :
                          modeloActivo === '347' ? `Modelo347_Anual_${empresaId.replace(/\s+/g, '')}_${anio}.pdf` :
                          `Modelo349_Borrador_${empresaId.replace(/\s+/g, '')}_${trimestre}_${anio}.pdf`
                       }
                    />
                 ) : (
                    <button disabled className="w-full sm:w-auto bg-slate-300 text-slate-500 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       Descargar Borrador Oficial
                    </button>
                 )}
              </div>
            </header>

            {/* 🗓️ CALENDARIO FISCAL */}
            {planActivo === 'pro' && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                {proximosVencimientos.map((v, i) => (
                  <div
                    key={`${v.modelo}-${v.etiqueta}-${v.yearV}`}
                    className={`rounded-2xl border p-4 flex items-start gap-3 ${
                      v.diasRestantes <= 14
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      v.diasRestantes <= 14 ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                      {i === 0 ? '⏰' : '📅'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {v.etiqueta} · {v.fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate">{v.modelo}</p>
                      <p className={`text-xs font-semibold mt-0.5 ${
                        v.diasRestantes <= 14 ? 'text-amber-700' : 'text-slate-500'
                      }`}>
                        {v.diasRestantes === 0
                          ? 'Vence hoy'
                          : v.diasRestantes === 1
                            ? 'Vence mañana'
                            : `${v.diasRestantes} días restantes`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 🚀 PESTAÑAS TRIBUTARIAS AMPLIADAS */}
            {planActivo === 'pro' && (
               <div className="flex flex-wrap gap-6 mb-6 border-b border-slate-200">
                  <button 
                     onClick={() => setModeloActivo("303")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '303' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     🏢 Mod. 303 (IVA)
                  </button>
                  <button 
                     onClick={() => setModeloActivo("130")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '130' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     👤 Mod. 130 (IRPF)
                  </button>
                  <button 
                     onClick={() => setModeloActivo("390")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '390' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     📅 Mod. 390 (IVA Anual)
                  </button>
                  <button 
                     onClick={() => setModeloActivo("115")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '115' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     🏠 Mod. 115 (Alquiler)
                  </button>
                  <button 
                     onClick={() => setModeloActivo("111")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '111' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     💼 Mod. 111 (Profesionales)
                  </button>
                  <button 
                     onClick={() => setModeloActivo("347")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '347' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     📊 Mod. 347 (Ops &gt; 3.000€)
                  </button>
                  <button 
                     onClick={() => setModeloActivo("349")} 
                     className={`pb-3 text-sm font-black transition border-b-2 ${modeloActivo === '349' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     🇪🇺 Mod. 349 (Intracom.)
                  </button>
               </div>
            )}

            {/* MURO DE PAGO PARA EL PLAN PRO */}
            {planActivo !== 'pro' ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8">
                   <div className="p-10 md:p-20 flex flex-col items-center justify-center text-center relative">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                         <span className="text-5xl">🏛️</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest mb-4">
                         Módulo Fiscal Premium
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Cálculo Oficial Automático</h2>
                      <p className="text-base text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed font-medium">
                         La generación automática de todos los Modelos Tributarios (303, 130, 390, 115, 111, 347, 349) está reservada para el Plan Empresa Pro. Olvídate de la calculadora y evita sanciones.
                      </p>
                      <Link href="/precios" className="bg-orange-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition hover:-translate-y-1 flex items-center gap-2">
                         ⭐ Mejorar a Plan Empresa Pro
                      </Link>
                   </div>
                </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                 {isLoadingData ? (
                    // 🚀 UX PREMIUM: evita mostrar un modelo con casillas en 0€ mientras llegan los datos reales
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                       <div className="p-6 md:p-8 bg-slate-100">
                          <Skeleton className="h-7 w-56 mb-2" />
                          <Skeleton className="h-4 w-72" />
                       </div>
                       <div className="p-6 md:p-10 space-y-4">
                          {Array.from({ length: 4 }).map((_, i) => (
                             <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-5 w-24" />
                             </div>
                          ))}
                          <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <Skeleton className="h-5 w-40" />
                             <Skeleton className="h-10 w-40" />
                          </div>
                       </div>
                    </div>
                 ) : (
                 <>
                 {/* VISTA MODELO 303 */}
                 {modeloActivo === '303' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-orange-500 p-6 md:p-8 text-white">
                          <h2 className="text-2xl font-black tracking-tight">Modelo 303 (IVA)</h2>
                          <p className="font-medium text-orange-100 mt-1">Borrador trimestral para <strong>{empresaId}</strong></p>
                       </div>

                       <div className="p-6 md:p-10 space-y-10">
                          <section>
                             <h3 className="text-sm font-black text-orange-600 uppercase tracking-widest mb-4">I. IVA Devengado (Tus Ingresos)</h3>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/3">Régimen general ordinario (21%)</span>
                                   <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end gap-x-8 gap-y-2 w-full sm:w-2/3">
                                      <div className="flex flex-col items-start sm:items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Base [01]</span>
                                         <span className="text-sm font-bold text-slate-900">{mod303.base21.toFixed(2)} €</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo [02]</span>
                                         <span className="text-sm font-bold text-slate-900">21%</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota [03]</span>
                                         <span className="text-sm font-black text-emerald-600">+{mod303.cuota21.toFixed(2)} €</span>
                                      </div>
                                   </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/3">Régimen reducido (10%)</span>
                                   <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end gap-x-8 gap-y-2 w-full sm:w-2/3">
                                      <div className="flex flex-col items-start sm:items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Base [04]</span>
                                         <span className="text-sm font-bold text-slate-900">{mod303.base10.toFixed(2)} €</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo [05]</span>
                                         <span className="text-sm font-bold text-slate-900">10%</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota [06]</span>
                                         <span className="text-sm font-black text-emerald-600">+{mod303.cuota10.toFixed(2)} €</span>
                                      </div>
                                   </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/3">Régimen superreducido (4%)</span>
                                   <div className="flex flex-wrap sm:flex-nowrap justify-between sm:justify-end gap-x-8 gap-y-2 w-full sm:w-2/3">
                                      <div className="flex flex-col items-start sm:items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Base [07]</span>
                                         <span className="text-sm font-bold text-slate-900">{mod303.base4.toFixed(2)} €</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo [08]</span>
                                         <span className="text-sm font-bold text-slate-900">4%</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota [09]</span>
                                         <span className="text-sm font-black text-emerald-600">+{mod303.cuota4.toFixed(2)} €</span>
                                      </div>
                                   </div>
                                </div>

                                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                   <span className="text-sm font-black text-orange-800 uppercase tracking-wide">Suma de Cuotas [27]:</span>
                                   <span className="text-lg font-black text-orange-600">+{mod303.totalCuotaDevengada.toFixed(2)} €</span>
                                </div>
                             </div>
                          </section>

                          <section>
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">II. IVA Deducible (Tus Gastos)</h3>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Operaciones interiores corrientes</span>
                                   <div className="flex justify-between sm:justify-end gap-8 w-full sm:w-1/2">
                                      <div className="flex flex-col items-start sm:items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Base [28]</span>
                                         <span className="text-sm font-bold text-slate-900">{mod303.baseDeducible.toFixed(2)} €</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Cuota Deducible [29]</span>
                                         <span className="text-sm font-black text-rose-500">-{mod303.cuotaDeducible.toFixed(2)} €</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </section>

                          <section className="pt-6 border-t border-slate-200">
                             <div className={`p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 border ${mod303.resultado > 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                                <span className="text-sm font-black text-slate-600 uppercase tracking-widest">Resultado Liquidación [71]</span>
                                <div className="text-left sm:text-right">
                                   <span className={`text-4xl md:text-5xl font-black tracking-tight ${mod303.resultado > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                                      {mod303.resultado > 0 ? 'A Pagar:' : 'A Favor:'} {Math.abs(mod303.resultado).toFixed(2)} €
                                   </span>
                                </div>
                             </div>
                          </section>
                       </div>
                    </div>
                 )}

                 {/* VISTA MODELO 130 */}
                 {modeloActivo === '130' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-emerald-600 p-6 md:p-8 text-white">
                          <h2 className="text-2xl font-black tracking-tight">Modelo 130 (IRPF)</h2>
                          <p className="font-medium text-emerald-100 mt-1">Acumulado anual (Enero a cierre del <strong>{trimestre}</strong>) para <strong>{empresaId}</strong></p>
                       </div>

                       <div className="p-6 md:p-10 space-y-10">
                          <section>
                             <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-4">I. Rendimiento Neto</h3>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700">Ingresos computables (Acumulados)</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [01]</span>
                                      <span className="text-lg font-black text-emerald-600">+{mod130.ingresosTotales.toFixed(2)} €</span>
                                   </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700">Gastos deducibles (Acumulados)</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [02]</span>
                                      <span className="text-lg font-black text-rose-500">-{mod130.gastosTotales.toFixed(2)} €</span>
                                   </div>
                                </div>

                                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                   <span className="text-sm font-black text-emerald-800 uppercase tracking-wide">Rendimiento Neto [03]:</span>
                                   <span className="text-lg font-black text-emerald-600">{mod130.rendimientoNeto.toFixed(2)} €</span>
                                </div>
                             </div>
                          </section>

                          <section className="pt-6 border-t border-slate-200">
                             <div className={`p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 border ${mod130.pagoFraccionado > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div>
                                   <span className="text-sm font-black text-slate-600 uppercase tracking-widest block">Pago Fraccionado (20%) [04]</span>
                                   <span className="text-xs text-slate-500 font-medium mt-1 block">Si el rendimiento [03] es negativo, no se paga IRPF.</span>
                                </div>
                                <div className="text-left sm:text-right">
                                   <span className={`text-4xl md:text-5xl font-black tracking-tight ${mod130.pagoFraccionado > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                      {mod130.pagoFraccionado > 0 ? 'A Pagar:' : ''} {mod130.pagoFraccionado.toFixed(2)} €
                                   </span>
                                </div>
                             </div>
                          </section>
                       </div>
                    </div>
                 )}

                 {/* VISTA MODELO 390 (RESUMEN ANUAL) */}
                 {modeloActivo === '390' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-purple-600 p-6 md:p-8 text-white">
                          <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-black tracking-tight">Modelo 390 (Resumen Anual IVA)</h2>
                                <p className="font-medium text-purple-100 mt-1">Consolidado del ejercicio <strong>{anio}</strong> para <strong>{empresaId}</strong></p>
                             </div>
                             <span className="bg-purple-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-purple-400">
                                🔒 Informativo AEAT
                             </span>
                          </div>
                       </div>

                       <div className="p-6 md:p-10 space-y-10">
                          {/* ESCUDO DE VERIFICACIÓN */}
                          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                             <span className="text-2xl">🛡️</span>
                             <div>
                                <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide">Comprobación de Coherencia Fiscal</h4>
                                <p className="text-xs text-purple-700 font-medium mt-0.5">
                                   Los datos anuales han sido auditados con tu Libro Mayor. Este resumen consolida todas tus ventas reales y rectificativas.
                                </p>
                             </div>
                          </div>

                          <section>
                             <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-4">I. Volumen Total de Operaciones (Ingresos)</h3>
                             <div className="space-y-3">
                                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                   <span className="text-xs font-bold text-slate-700">Bases Imponibles al 21%</span>
                                   <span className="text-sm font-black text-slate-900">{mod390.base21.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                   <span className="text-xs font-bold text-slate-700">Bases Imponibles al 10%</span>
                                   <span className="text-sm font-black text-slate-900">{mod390.base10.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                   <span className="text-xs font-bold text-slate-700">Bases Imponibles al 4%</span>
                                   <span className="text-sm font-black text-slate-900">{mod390.base4.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                   <span className="text-xs font-bold text-slate-700">Operaciones Exentas (0%)</span>
                                   <span className="text-sm font-black text-slate-900">{mod390.base0.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-2xl border border-purple-100 mt-2">
                                   <span className="text-xs font-black text-purple-900 uppercase">Volumen Total Facturado [108]:</span>
                                   <span className="text-lg font-black text-purple-600">+{mod390.totalIngresos.toFixed(2)} €</span>
                                </div>
                             </div>
                          </section>

                          <section>
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">II. Resumen de Cuotas Anuales</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                   <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total IVA Devengado (Cobrado)</span>
                                   <span className="text-xl font-black text-emerald-600">+{mod390.totalCuotaDevengada.toFixed(2)} €</span>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                   <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total IVA Deducible (Soportado)</span>
                                   <span className="text-xl font-black text-rose-500">-{mod390.cuotaGastos.toFixed(2)} €</span>
                                </div>
                             </div>
                          </section>

                          <section className="pt-6 border-t border-slate-200">
                             <div className="p-6 md:p-8 bg-purple-50 border border-purple-200 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                   <span className="text-sm font-black text-purple-900 uppercase tracking-widest block">Resultado Anual Convalidado [84]</span>
                                   <span className="text-xs text-purple-600 font-medium mt-1 block">Suma de las liquidaciones de los cuatro trimestres.</span>
                                </div>
                                <div className="text-left sm:text-right">
                                   <span className="text-4xl md:text-5xl font-black tracking-tight text-purple-700">
                                      {mod390.resultadoAnual.toFixed(2)} €
                                   </span>
                                </div>
                             </div>
                          </section>
                       </div>
                    </div>
                 )}

                 {/* Modelo 115 — solo alquileres (19%) */}
                 {modeloActivo === '115' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-pink-500 p-6 md:p-8 text-white">
                          <h2 className="text-2xl font-black tracking-tight">Modelo 115 (Alquileres)</h2>
                          <p className="font-medium text-pink-100 mt-1">Retenciones e ingresos a cuenta por arrendamientos · <strong>{empresaId}</strong></p>
                       </div>
                       <div className="p-6 md:p-10 space-y-10">
                          <div className="p-4 bg-pink-50 rounded-2xl border border-pink-100 text-xs text-pink-800 font-medium">
                             Solo incluye gastos categorizados como alquiler o arrendamiento. Las retenciones a profesionales van al Modelo 111.
                          </div>
                          <section>
                             <h3 className="text-sm font-black text-pink-600 uppercase tracking-widest mb-4">I. Retenciones e Ingresos a Cuenta</h3>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Nº de perceptores</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [01]</span>
                                      <span className="text-lg font-black text-slate-900">{mod115.numPerceptores}</span>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Base Retenciones (Alquileres)</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [02]</span>
                                      <span className="text-lg font-black text-slate-900">{mod115.baseRetencion.toFixed(2)} €</span>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Retenciones (19%)</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [03]</span>
                                      <span className="text-lg font-black text-pink-600">{mod115.totalRetencion.toFixed(2)} €</span>
                                   </div>
                                </div>
                             </div>
                          </section>
                          <section className="pt-6 border-t border-slate-200">
                             <div className="p-6 md:p-8 bg-pink-50 border border-pink-200 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                   <span className="text-sm font-black text-pink-900 uppercase tracking-widest block">Total a Ingresar [05]</span>
                                   <span className="text-xs text-pink-700 font-medium mt-1 block">Importe retenido por alquileres a ingresar en AEAT.</span>
                                </div>
                                <div className="text-left sm:text-right">
                                   <span className="text-4xl md:text-5xl font-black tracking-tight text-pink-600">
                                      A Pagar: {mod115.totalRetencion.toFixed(2)} €
                                   </span>
                                </div>
                             </div>
                          </section>
                       </div>
                    </div>
                 )}

                 {/* Modelo 111 — profesionales (15%) */}
                 {modeloActivo === '111' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-rose-500 p-6 md:p-8 text-white">
                          <h2 className="text-2xl font-black tracking-tight">Modelo 111 (Profesionales)</h2>
                          <p className="font-medium text-rose-100 mt-1">Retenciones e ingresos a cuenta por rendimientos del trabajo y actividades profesionales · <strong>{empresaId}</strong></p>
                       </div>
                       <div className="p-6 md:p-10 space-y-10">
                          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-xs text-rose-800 font-medium">
                             Incluye gastos categorizados como profesional, asesor, abogado, consultor o autónomo. Tipo orientativo del 15%.
                          </div>
                          <section>
                             <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-4">I. Retenciones e Ingresos a Cuenta</h3>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Nº de perceptores</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [01]</span>
                                      <span className="text-lg font-black text-slate-900">{mod111.numPerceptores}</span>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Base Retenciones (Profesionales)</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [02]</span>
                                      <span className="text-lg font-black text-slate-900">{mod111.baseRetencion.toFixed(2)} €</span>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <span className="text-sm font-bold text-slate-700 sm:w-1/2">Retenciones (15%)</span>
                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Casilla [03]</span>
                                      <span className="text-lg font-black text-rose-600">{mod111.totalRetencion.toFixed(2)} €</span>
                                   </div>
                                </div>
                             </div>
                          </section>
                          <section className="pt-6 border-t border-slate-200">
                             <div className="p-6 md:p-8 bg-rose-50 border border-rose-200 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                   <span className="text-sm font-black text-rose-900 uppercase tracking-widest block">Total a Ingresar</span>
                                   <span className="text-xs text-rose-700 font-medium mt-1 block">Importe retenido a profesionales a ingresar en AEAT.</span>
                                </div>
                                <div className="text-left sm:text-right">
                                   <span className="text-4xl md:text-5xl font-black tracking-tight text-rose-600">
                                      A Pagar: {mod111.totalRetencion.toFixed(2)} €
                                   </span>
                                </div>
                             </div>
                          </section>
                       </div>
                    </div>
                 )}

                 {/* 🚀 NUEVA VISTA MODELO 347 */}
                 {modeloActivo === '347' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-cyan-600 p-6 md:p-8 text-white">
                          <h2 className="text-2xl font-black tracking-tight">Modelo 347 (Ops &gt; 3.000€)</h2>
                          <p className="font-medium text-cyan-100 mt-1">Declaración anual de operaciones con terceros (<strong>{anio}</strong>)</p>
                       </div>
                       <div className="p-6 md:p-10 space-y-6">
                          <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 flex items-center gap-3">
                             <span className="text-2xl">🚨</span>
                             <div>
                                <h4 className="text-xs font-black text-cyan-900 uppercase tracking-wide">Alerta de Chivato Fiscal</h4>
                                <p className="text-xs text-cyan-800 font-medium mt-0.5">
                                   El sistema ha detectado {mod347.detalle.length} {mod347.detalle.length === 1 ? 'operación' : 'operaciones'} que superan el límite legal de 3.005,06€ anuales con un mismo proveedor o cliente.
                                </p>
                             </div>
                          </div>
                          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase">
                                   <tr>
                                      <th className="px-6 py-3">Nombre / Razón Social</th>
                                      <th className="px-6 py-3 text-right">Importe Anual</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-sm font-bold text-slate-800">
                                   {mod347.detalle.length === 0 ? (
                                      <tr>
                                         <td colSpan={2} className="px-6 py-8 text-center text-slate-400">No hay operaciones que superen los 3.005,06€ este año.</td>
                                      </tr>
                                   ) : (
                                      mod347.detalle.map((op: any, i: number) => (
                                         <tr key={i}>
                                            <td className="px-6 py-4">{op.nombre}</td>
                                            <td className="px-6 py-4 text-right text-cyan-700">{op.importe.toFixed(2)} €</td>
                                         </tr>
                                      ))
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* 🚀 NUEVA VISTA MODELO 349 */}
                 {modeloActivo === '349' && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                       <div className="bg-indigo-600 p-6 md:p-8 text-white">
                          <h2 className="text-2xl font-black tracking-tight">Modelo 349 (Europa)</h2>
                          <p className="font-medium text-indigo-100 mt-1">Declaración de Operaciones Intracomunitarias (<strong>{trimestre} {anio}</strong>)</p>
                       </div>
                       <div className="p-6 md:p-10 space-y-10">
                          <section>
                             <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4">Resumen de Operaciones (0% IVA)</h3>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <div>
                                      <span className="text-sm font-bold text-slate-700 block">Entregas Intracomunitarias</span>
                                      <span className="text-xs text-slate-400 font-medium">Ventas de servicios o bienes en la UE.</span>
                                   </div>
                                   <div className="text-left sm:text-right">
                                      <span className="text-lg font-black text-emerald-600">+{mod349.entregas.toFixed(2)} €</span>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                   <div>
                                      <span className="text-sm font-bold text-slate-700 block">Adquisiciones Intracomunitarias</span>
                                      <span className="text-xs text-slate-400 font-medium">Compras (ej. software, herramientas) en la UE.</span>
                                   </div>
                                   <div className="text-left sm:text-right">
                                      <span className="text-lg font-black text-rose-500">-{mod349.adquisiciones.toFixed(2)} €</span>
                                   </div>
                                </div>
                             </div>
                          </section>
                       </div>
                    </div>
                 )}
                 </>
                 )}
              </div>
            )}
            <div className="h-10"></div>
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
                            <input type="text" placeholder="Buscar..." value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64" />
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