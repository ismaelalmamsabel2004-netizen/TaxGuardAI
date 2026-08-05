"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useUser, UserButton, Show, SignInButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Toaster, toast } from 'sonner';

import { obtenerDatosSupabase, obtenerEmpresasCliente, verificarRolUsuario, obtenerPerfilEspacio } from '../actions';
import { obtenerAjustesSilencioso, obtenerAjustes, guardarAjustes } from '../../lib/settingsClient';
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

const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#6366f1', '#14b8a6', '#64748b'];

export default function AnalisisAvanzado() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [espaciosCliente, setEspaciosCliente] = useState<any[]>([]);
  const [rolUsuario, setRolUsuario] = useState('LOADING');
  const [perfilEmpresa, setPerfilEmpresa] = useState({ sector: "", objetivo: "" });
  
  const [allData, setAllData] = useState<any[]>([]);
  const [filtroTiempo, setFiltroTiempo] = useState("year"); 
  const [aiAnalysis, setAiAnalysis] = useState("## Análisis Preliminar\nPara iniciar la auditoría profunda, asegúrate de tener datos registrados en el Libro Mayor y selecciona un escenario de simulación en los botones superiores.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [simulacionActiva, setSimulacionActiva] = useState("General");

  const [planActivo, setPlanActivo] = useState('loading');
  // 🚀 UX PREMIUM: evita pantallas en blanco/parpadeos en KPIs y gráficos mientras llegan los datos
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 🚀 ESTADOS PARA EL MODAL DE SOPORTE
  const [showSupportModal, setShowSupportModal] = useState(false);

  // 🛡️ BLINDAJE DE ESTADO: ignora respuestas tardías si el usuario cambia de empresa muy rápido
  // (evita mezclar los datos financieros de dos empresas distintas en pantalla).
  const empresaSolicitadaRef = useRef<string>("");

  const esLectura = rolUsuario === 'LECTURA';

  const cargarPerfilEmpresa = async (id: string, ajustes?: any) => {
    if (esEspacioCliente(id)) {
      const perfilRemoto = await obtenerPerfilEspacio(id);
      if (empresaSolicitadaRef.current !== id) return;
      if (perfilRemoto.success && perfilRemoto.perfil) {
        setPerfilEmpresa({
          sector: perfilRemoto.perfil.sector || "No definido",
          objetivo: perfilRemoto.perfil.objetivo || "No definido",
        });
      } else {
        setPerfilEmpresa({ sector: "No definido", objetivo: "No definido" });
      }
      return;
    }
    const perfiles = ajustes?.perfiles;
    if (perfiles && perfiles[id]) {
      setPerfilEmpresa(perfiles[id]);
    } else {
      setPerfilEmpresa({ sector: "No definido", objetivo: "No definido" });
    }
  };

  useEffect(() => {
    setIsMounted(true);
    
    if (!isLoaded) return;
    if (!isSignedIn) return;

    obtenerEmpresasCliente().then(setEspaciosCliente);

    obtenerAjustesSilencioso()
      .then(async (ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         
         if (planDetectado === 'free') {
            router.push('/precios');
            return; 
         }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Mi Empresa"];
         setEmpresas(listaEmpresas);
         const activa = resolverEspacioInicial(ajustesGuardados.empresaActiva, listaEmpresas);
         empresaSolicitadaRef.current = activa;
         setEmpresaId(activa);
         if (esEspacioCliente(activa)) guardarEspacioSesion(activa);
         else limpiarEspacioSesion();

         await cargarPerfilEmpresa(activa, ajustesGuardados);

         if (activa) {
            setIsLoadingData(true);
            obtenerDatosSupabase(activa).then(d => {
              if (empresaSolicitadaRef.current !== activa) return; // Respuesta obsoleta
              setAllData(d);
              setIsLoadingData(false);
            });
         } else {
            setIsLoadingData(false);
         }
      });
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!empresaId) return;
    setRolUsuario('LOADING');
    verificarRolUsuario(empresaId).then((res) => {
      if (empresaSolicitadaRef.current === empresaId) setRolUsuario(res.rol);
    });
  }, [empresaId]);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    empresaSolicitadaRef.current = nuevaEmpresa;
    setEmpresaId(nuevaEmpresa);
    setRolUsuario('LOADING');
    setAiAnalysis("## Análisis Preliminar\nHas cambiado de empresa. Selecciona un escenario para analizar este nuevo espacio de trabajo.");

    if (esEspacioCliente(nuevaEmpresa)) {
      guardarEspacioSesion(nuevaEmpresa);
      await cargarPerfilEmpresa(nuevaEmpresa);
    } else {
      limpiarEspacioSesion();
      const actuales = await obtenerAjustes();
      if (!actuales) return; // 🛡️ Sin conexión: abortamos para no pisar los ajustes reales de la nube.
      await guardarAjustes({ ...actuales, empresaActiva: nuevaEmpresa });
      await cargarPerfilEmpresa(nuevaEmpresa, actuales);
    }

    setIsLoadingData(true);
    obtenerDatosSupabase(nuevaEmpresa).then(d => {
      if (empresaSolicitadaRef.current !== nuevaEmpresa) return; // Respuesta obsoleta
      setAllData(d);
      setIsLoadingData(false);
    });
  };

  const salirModoAsesor = async () => {
    limpiarEspacioSesion();
    const propia = empresas[0] || 'Mi Empresa';
    await cambiarEmpresa(propia);
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

  // 🚀 RENDIMIENTO: se calculaba con un useEffect + 5 useState (doble render en cada
  // cambio de datos/filtro: uno con los valores viejos y otro con los nuevos tras el
  // setState). Con useMemo el valor correcto está disponible desde el primer render.
  const {
    chartDataEvolucion,
    chartDataGastos,
    chartDataProyectos,
    kpis,
    trends,
    alertasRiesgo,
    topClientes,
    proyeccionCashflow,
    simulacionPrecios,
    etiquetaFiltro,
  } = useMemo(() => {
    const kpisVacios = { ingresos: 0, gastos: 0, beneficio: 0, margen: 0, beneficioLiquido: 0, provisionImpuestos: 0, runwayMeses: 0 };
    const trendsVacios = { ingresos: 0, gastos: 0, beneficio: 0 };
    const vaciosExtra = {
      alertasRiesgo: [] as { tipo: 'critico' | 'advertencia' | 'info'; titulo: string; texto: string }[],
      topClientes: [] as { nombre: string; importe: number; pct: number }[],
      proyeccionCashflow: [] as { name: string; Ingresos: number; Gastos: number; Saldo: number; meses: number }[],
      simulacionPrecios: {
        ingresosActuales: 0, beneficioActual: 0, margenActual: 0,
        ingresosSimulados: 0, beneficioSimulado: 0, margenSimulado: 0,
        deltaBeneficio: 0, hipotesis: 'Precio +10% y volumen −5%',
      },
      etiquetaFiltro: '12 meses',
    };

    if (!allData || allData.length === 0) {
       return {
         chartDataEvolucion: [] as any[],
         chartDataGastos: [] as any[],
         chartDataProyectos: [] as any[],
         kpis: kpisVacios,
         trends: trendsVacios,
         ...vaciosExtra,
       };
    }

    const ahora = new Date().getTime();
    const diasFiltro = filtroTiempo === 'week' ? 7 : filtroTiempo === 'month' ? 30 : filtroTiempo === 'quarter' ? 90 : filtroTiempo === 'year' ? 365 : Infinity;
    
    let totalIngresos = 0; let totalGastos = 0;
    let prevIngresos = 0; let prevGastos = 0;
    let ivaRepercutido = 0; let ivaSoportado = 0;
    
    const mensualidades: Record<string, { Ingresos: number, Gastos: number, sortKey: number }> = {};
    const categoriasGastos: Record<string, number> = {};
    const proyectosMap: Record<string, { Ingresos: number, Gastos: number }> = {};

    let globalIngresos = 0; let globalGastos = 0; let globalIvaRep = 0; let globalIvaSop = 0;
    const globalMesesActivos = new Set<string>();

    allData.forEach(item => {
        if (item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-')) return;
        if (!item.name || !item.name.includes('/')) return;

        const baseVal = Number(item.total);
        const iva = Number(item.iva) || 0;
        
        // 🚀 CORRECCIÓN: CÁLCULO DE TOTALES REALES (Base + IVA)
        const totalOperacion = Math.abs(baseVal) * (1 + (iva / 100));

        const gastoAbsoluto = baseVal < 0 ? totalOperacion : 0;
        const ingresoAbsoluto = baseVal > 0 ? totalOperacion : 0;
        
        const [d, m, y] = item.name.split('/');
        
        globalIngresos += ingresoAbsoluto;
        globalGastos += gastoAbsoluto;
        if (baseVal > 0) globalIvaRep += Math.abs(baseVal) * (iva / 100);
        else globalIvaSop += Math.abs(baseVal) * (iva / 100);
        globalMesesActivos.add(`${y}-${m}`);

        const fechaItem = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);

        if (diffDias <= diasFiltro) {
            totalIngresos += ingresoAbsoluto;
            totalGastos += gastoAbsoluto;

            if (baseVal > 0) ivaRepercutido += Math.abs(baseVal) * (iva / 100);
            else ivaSoportado += Math.abs(baseVal) * (iva / 100);

            const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const mesLlave = `${nombresMeses[Number(m) - 1]} ${y}`;
            const sortKey = Number(y) * 100 + Number(m); 

            if (!mensualidades[mesLlave]) mensualidades[mesLlave] = { Ingresos: 0, Gastos: 0, sortKey };
            if (baseVal > 0) mensualidades[mesLlave].Ingresos += ingresoAbsoluto;
            else mensualidades[mesLlave].Gastos += gastoAbsoluto;

            if (baseVal < 0) {
                const cat = item.categoria || 'General';
                categoriasGastos[cat] = (categoriasGastos[cat] || 0) + gastoAbsoluto;
            }

            const matchProy = item.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
            if (matchProy && matchProy[1]) {
                const pName = matchProy[1];
                if (!proyectosMap[pName]) proyectosMap[pName] = { Ingresos: 0, Gastos: 0 };
                if (baseVal > 0) proyectosMap[pName].Ingresos += ingresoAbsoluto;
                else proyectosMap[pName].Gastos += gastoAbsoluto;
            }
        } 
        else if (diffDias > diasFiltro && diffDias <= diasFiltro * 2) {
            prevIngresos += ingresoAbsoluto;
            prevGastos += gastoAbsoluto;
        }
    });

    const evolutionArray = Object.keys(mensualidades)
        .map(key => ({ name: key, Ingresos: mensualidades[key].Ingresos, Gastos: mensualidades[key].Gastos, sortKey: mensualidades[key].sortKey }))
        .sort((a, b) => a.sortKey - b.sortKey); 

    const gastosArray = Object.keys(categoriasGastos).map(key => ({
        name: key, value: categoriasGastos[key]
    })).sort((a, b) => b.value - a.value); 

    const proyectosArray = Object.keys(proyectosMap).map(key => {
        const ing = proyectosMap[key].Ingresos;
        const gas = proyectosMap[key].Gastos;
        const marg = ing - gas;
        return {
            name: key, ingresos: ing, gastos: gas, margen: marg,
            rentabilidad: ing > 0 ? (marg / ing) * 100 : (gas > 0 ? -100 : 0)
        };
    }).sort((a, b) => b.margen - a.margen);

    const beneficio = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? (beneficio / totalIngresos) * 100 : 0;
    const prevBeneficio = prevIngresos - prevGastos;
    const liquidacionIva = ivaRepercutido - ivaSoportado;
    const provisionIRPF = beneficio > 0 ? beneficio * 0.15 : 0; 
    const provisionImpuestos = (liquidacionIva > 0 ? liquidacionIva : 0) + provisionIRPF;
    const beneficioLiquido = beneficio - provisionImpuestos;

    const globalBeneficio = globalIngresos - globalGastos;
    const globalProvision = Math.max(0, globalIvaRep - globalIvaSop) + (globalBeneficio > 0 ? globalBeneficio * 0.15 : 0);
    const globalCajaLibre = globalBeneficio - globalProvision;
    const globalGastoMedioMensual = globalGastos / Math.max(1, globalMesesActivos.size);
    const globalRunway = globalGastoMedioMensual > 0 && globalCajaLibre > 0 ? (globalCajaLibre / globalGastoMedioMensual) : 0;

    const calcTrend = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    // ——— Centro de Riesgos ———
    const pendientes = allData.filter(d => {
      if (d.categoria === 'Presupuestos' || d.numero_factura?.startsWith('P-')) return false;
      return d.estado_pago === 'PENDIENTE';
    });
    const cobrosPendientes = pendientes.filter(d => Number(d.total) > 0);
    const pagosPendientes = pendientes.filter(d => Number(d.total) < 0);
    const importeCobrosPend = cobrosPendientes.reduce((acc, d) => {
      const base = Math.abs(Number(d.total));
      const iva = Number(d.iva) || 0;
      return acc + base * (1 + iva / 100);
    }, 0);
    const importePagosPend = pagosPendientes.reduce((acc, d) => {
      const base = Math.abs(Number(d.total));
      const iva = Number(d.iva) || 0;
      return acc + base * (1 + iva / 100);
    }, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencidas = pendientes.filter(d => {
      if (!d.raw_fecha_vencimiento && !d.fecha_vencimiento) return false;
      const fv = d.raw_fecha_vencimiento
        ? new Date(d.raw_fecha_vencimiento)
        : (() => {
            const parts = String(d.fecha_vencimiento).split('/');
            if (parts.length !== 3) return null;
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          })();
      if (!fv || Number.isNaN(fv.getTime())) return false;
      return fv < hoy;
    });

    // Pico de gasto: categoría del periodo vs media mensual histórica de esa categoría
    const gastosPorCatMes: Record<string, Record<string, number>> = {};
    allData.forEach(item => {
      if (item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-')) return;
      if (!(Number(item.total) < 0)) return;
      if (!item.name?.includes('/')) return;
      const [, m, y] = item.name.split('/');
      const cat = item.categoria || 'General';
      const key = `${y}-${Number(m)}`;
      const base = Math.abs(Number(item.total));
      const iva = Number(item.iva) || 0;
      const total = base * (1 + iva / 100);
      if (!gastosPorCatMes[cat]) gastosPorCatMes[cat] = {};
      gastosPorCatMes[cat][key] = (gastosPorCatMes[cat][key] || 0) + total;
    });
    const picosGasto: { categoria: string; actual: number; media: number; ratio: number }[] = [];
    const mesActualKey = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`;
    Object.keys(gastosPorCatMes).forEach(cat => {
      const meses = Object.keys(gastosPorCatMes[cat]);
      if (meses.length < 2) return;
      const actual = gastosPorCatMes[cat][mesActualKey] || 0;
      if (actual <= 0) return;
      const historicos = meses.filter(k => k !== mesActualKey).map(k => gastosPorCatMes[cat][k]);
      const media = historicos.reduce((a, b) => a + b, 0) / Math.max(1, historicos.length);
      if (media > 50 && actual > media * 1.5) {
        picosGasto.push({ categoria: cat, actual, media, ratio: actual / media });
      }
    });
    picosGasto.sort((a, b) => b.ratio - a.ratio);

    const alertasRiesgo: { tipo: 'critico' | 'advertencia' | 'info'; titulo: string; texto: string }[] = [];
    if (importeCobrosPend > 0) {
      alertasRiesgo.push({
        tipo: 'critico',
        titulo: 'Cobros pendientes',
        texto: `${cobrosPendientes.length} factura(s) por cobrar · ${importeCobrosPend.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      });
    }
    if (importePagosPend > 0) {
      alertasRiesgo.push({
        tipo: 'advertencia',
        titulo: 'Pagos pendientes',
        texto: `${pagosPendientes.length} factura(s) por pagar · ${importePagosPend.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      });
    }
    if (vencidas.length > 0) {
      alertasRiesgo.push({
        tipo: 'critico',
        titulo: 'Facturas vencidas',
        texto: `${vencidas.length} documento(s) han superado la fecha de vencimiento.`,
      });
    }
    if (globalRunway > 0 && globalRunway < 3) {
      alertasRiesgo.push({
        tipo: 'critico',
        titulo: 'Runway crítico',
        texto: `Solo ${globalRunway.toFixed(1)} meses de supervivencia con ingresos a cero.`,
      });
    }
    if (margen < 5 && totalIngresos > 0) {
      alertasRiesgo.push({
        tipo: 'advertencia',
        titulo: 'Margen bajo',
        texto: `El margen operativo del periodo es del ${margen.toFixed(1)}% (umbral de alerta: 5%).`,
      });
    }
    if (picosGasto[0]) {
      const p = picosGasto[0];
      alertasRiesgo.push({
        tipo: 'advertencia',
        titulo: `Pico en ${p.categoria}`,
        texto: `Este mes lleva ${(p.ratio).toFixed(1)}× la media histórica (${p.actual.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €).`,
      });
    }

    // ——— Concentración clientes (ingresos del periodo) ———
    const clientesMap: Record<string, number> = {};
    allData.forEach(item => {
      if (item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-')) return;
      if (!(Number(item.total) > 0)) return;
      if (!item.name?.includes('/')) return;
      const [d, m, y] = item.name.split('/');
      const fechaItem = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
      const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);
      if (diffDias > diasFiltro) return;
      const nombre = (item.cliente_nombre || 'Sin cliente').trim() || 'Sin cliente';
      const base = Math.abs(Number(item.total));
      const iva = Number(item.iva) || 0;
      clientesMap[nombre] = (clientesMap[nombre] || 0) + base * (1 + iva / 100);
    });
    const topClientes = Object.keys(clientesMap)
      .map(nombre => ({ nombre, importe: clientesMap[nombre], pct: totalIngresos > 0 ? (clientesMap[nombre] / totalIngresos) * 100 : 0 }))
      .sort((a, b) => b.importe - a.importe)
      .slice(0, 5);

    // ——— Proyección tesorería 30/90 (determinista) ———
    const ingresoMedioMensual = globalIngresos / Math.max(1, globalMesesActivos.size);
    const gastoMedioMensual = globalGastoMedioMensual;

    // Recurrentes mensuales estimados
    let recurrentesIngresoMes = 0;
    let recurrentesGastoMes = 0;
    allData.forEach(item => {
      if (!item.isRecurrent) return;
      if (item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-')) return;
      const base = Math.abs(Number(item.total));
      const iva = Number(item.iva) || 0;
      const total = base * (1 + iva / 100);
      const freq = (item.frecuencia || 'mensual').toLowerCase();
      const factor = freq.includes('anual') ? 1 / 12 : freq.includes('trimes') ? 1 / 3 : freq.includes('seman') ? 4.3 : 1;
      if (Number(item.total) > 0) recurrentesIngresoMes += total * factor;
      else recurrentesGastoMes += total * factor;
    });

    // Evitar doble conteo: si hay recurrentes etiquetados, úsalos; si no, media histórica
    const proyIngresoMes = recurrentesIngresoMes > 0
      ? recurrentesIngresoMes + Math.max(0, ingresoMedioMensual - recurrentesIngresoMes) * 0.5
      : ingresoMedioMensual;
    const proyGastoMes = recurrentesGastoMes > 0
      ? recurrentesGastoMes + Math.max(0, gastoMedioMensual - recurrentesGastoMes) * 0.5
      : gastoMedioMensual;

    const cajaInicial = globalCajaLibre;
    const proyeccionCashflow = [1, 2, 3].map(mes => {
      const ingresos = proyIngresoMes * mes;
      const gastos = proyGastoMes * mes;
      const saldo = cajaInicial + ingresos - gastos;
      return {
        name: mes === 1 ? '30 días' : mes === 2 ? '60 días' : '90 días',
        Ingresos: Number(ingresos.toFixed(2)),
        Gastos: Number(gastos.toFixed(2)),
        Saldo: Number(saldo.toFixed(2)),
        meses: mes,
      };
    });

    // ——— Simulación precios +10% / −5% volumen ———
    const ingresosSim = totalIngresos * 1.10 * 0.95;
    const gastosSim = totalGastos; // costes fijos del periodo se mantienen
    const beneficioSim = ingresosSim - gastosSim;
    const margenSim = ingresosSim > 0 ? (beneficioSim / ingresosSim) * 100 : 0;
    const simulacionPrecios = {
      ingresosActuales: Number(totalIngresos.toFixed(2)),
      beneficioActual: Number(beneficio.toFixed(2)),
      margenActual: Number(margen.toFixed(2)),
      ingresosSimulados: Number(ingresosSim.toFixed(2)),
      beneficioSimulado: Number(beneficioSim.toFixed(2)),
      margenSimulado: Number(margenSim.toFixed(2)),
      deltaBeneficio: Number((beneficioSim - beneficio).toFixed(2)),
      hipotesis: 'Precio +10% y volumen −5%',
    };

    const etiquetaFiltro =
      filtroTiempo === 'week' ? '7 días' :
      filtroTiempo === 'month' ? '30 días' :
      filtroTiempo === 'quarter' ? '3 meses' :
      filtroTiempo === 'year' ? '12 meses' : 'Histórico completo';

    return {
      chartDataEvolucion: evolutionArray,
      chartDataGastos: gastosArray,
      chartDataProyectos: proyectosArray,
      kpis: { 
          ingresos: totalIngresos, gastos: totalGastos, beneficio, margen, beneficioLiquido, provisionImpuestos, 
          runwayMeses: globalRunway
      },
      trends: { 
          ingresos: calcTrend(totalIngresos, prevIngresos), 
          gastos: calcTrend(totalGastos, prevGastos), 
          beneficio: calcTrend(beneficio, prevBeneficio) 
      },
      alertasRiesgo,
      topClientes,
      proyeccionCashflow,
      simulacionPrecios,
      etiquetaFiltro,
    };
  }, [allData, filtroTiempo]);

  const generarAuditoria = async (tipoSimulacion: string) => {
    setSimulacionActiva(tipoSimulacion);
    if (allData.length === 0) {
      setAiAnalysis("⚠️ **Datos insuficientes.**\n\nNo hay transacciones en este Espacio de Trabajo. Por favor, añade ingresos o gastos en la Consola General para poder generar una auditoría.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(`⏳ **Conectando con el CFO Virtual...**\n\nEjecutando escenario: **${tipoSimulacion}**.\n\nAnalizando flujos de caja y aplicando modelos predictivos. Esto puede tardar hasta un minuto...`);

    const ahora = Date.now();
    const diasFiltro = filtroTiempo === 'week' ? 7 : filtroTiempo === 'month' ? 30 : filtroTiempo === 'quarter' ? 90 : filtroTiempo === 'year' ? 365 : Infinity;

    const datosLimpios = allData
      .filter(d => {
        if (d.categoria === 'Presupuestos' || d.numero_factura?.startsWith('P-')) return false;
        if (!d.name?.includes('/')) return false;
        const [dd, mm, yy] = d.name.split('/');
        const fechaItem = new Date(Number(yy), Number(mm) - 1, Number(dd)).getTime();
        const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);
        return diffDias <= diasFiltro;
      })
      .map(d => {
        const base = Number(d.total);
        const ivaPct = Number(d.iva) || 0;
        const totalConIva = Math.abs(base) * (1 + ivaPct / 100) * (base >= 0 ? 1 : -1);
        const matchProy = d.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
        return {
          fecha: d.name,
          categoria: d.categoria || 'General',
          baseImponible: Number(base.toFixed(2)),
          ivaPct,
          totalConIva: Number(totalConIva.toFixed(2)),
          tipo: Number(base) >= 0 ? 'ingreso' : 'gasto',
          recurrente: !!d.isRecurrent,
          frecuencia: d.frecuencia || null,
          cliente: d.cliente_nombre || null,
          concepto: d.concepto_detalle || null,
          factura: d.numero_factura || null,
          estado: d.estado_pago || null,
          proyecto: matchProy?.[1] || null,
        };
      })
      .sort((a, b) => {
        const pa = a.fecha.split('/');
        const pb = b.fecha.split('/');
        const ta = new Date(Number(pa[2]), Number(pa[1]) - 1, Number(pa[0])).getTime();
        const tb = new Date(Number(pb[2]), Number(pb[1]) - 1, Number(pb[0])).getTime();
        return tb - ta;
      });

    if (datosLimpios.length === 0) {
      setIsAnalyzing(false);
      setAiAnalysis("⚠️ **Sin datos en el periodo.**\n\nAmplía el filtro temporal o registra movimientos en este intervalo para auditar.");
      return;
    }

    let promptEspecial = "";
    if (tipoSimulacion === "Fugas") promptEspecial = "Haz un análisis agresivo buscando gastos innecesarios, fugas de capital y da 3 consejos para recortar costes estructurales (excepto Software/Suscripciones/TaxGuard).";
    else if (tipoSimulacion === "Precios") promptEspecial = "Comenta la simulación de precios +10% con pérdida de volumen −5% usando los números precalculados.";
    else if (tipoSimulacion === "Proyeccion") promptEspecial = "Explica la proyección de tesorería a 30/60/90 días usando los números precalculados y da acciones de caja.";
    else promptEspecial = "Haz una auditoría financiera general, destacando fortalezas, riesgos y estado del margen operativo.";

    const contextoEmpresarial = `Sector: ${perfilEmpresa.sector || 'General'}. Objetivo: ${perfilEmpresa.objetivo || 'Estabilidad'}. INSTRUCCIÓN IA: ${promptEspecial}`;

    const resumenEjecutivo = {
      periodo: etiquetaFiltro,
      ingresos: Number(kpis.ingresos.toFixed(2)),
      gastos: Number(kpis.gastos.toFixed(2)),
      beneficio: Number(kpis.beneficio.toFixed(2)),
      margenPct: Number(kpis.margen.toFixed(2)),
      beneficioLiquido: Number(kpis.beneficioLiquido.toFixed(2)),
      provisionImpuestos: Number(kpis.provisionImpuestos.toFixed(2)),
      runwayMeses: Number(kpis.runwayMeses.toFixed(2)),
      topCategoriasGasto: chartDataGastos.slice(0, 5).map(g => ({ categoria: g.name, importe: Number(g.value.toFixed(2)) })),
      topClientes: topClientes.map(c => ({ cliente: c.nombre, importe: Number(c.importe.toFixed(2)), pctIngresos: Number(c.pct.toFixed(1)) })),
      alertas: alertasRiesgo.map(a => a.titulo),
      movimientosEnPeriodo: datosLimpios.length,
    };

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          data: datosLimpios,
          empresaId,
          contextoSector: contextoEmpresarial,
          escenario: tipoSimulacion,
          resumenEjecutivo,
          proyeccion: tipoSimulacion === 'Proyeccion' || tipoSimulacion === 'General' ? proyeccionCashflow : undefined,
          simulacionPrecios: tipoSimulacion === 'Precios' || tipoSimulacion === 'General' ? simulacionPrecios : undefined,
          filtroPeriodo: etiquetaFiltro,
        }), 
      });
      
      const textDecoded = await res.text();
      
      try {
         const json = JSON.parse(textDecoded);
         if (res.ok && json.analysis) {
            setAiAnalysis(json.analysis);
         } else {
            setAiAnalysis(`❌ **Error:**\n\n${json.error || json.analysis || "Fallo desconocido."}`);
         }
      } catch(parseError) {
         setAiAnalysis(`❌ **Timeout o respuesta no válida:**\n\nEl servidor ha tardado demasiado o ha devuelto un formato inesperado (límite ~60s).\n\nDetalle:\n\`\`\`\n${textDecoded.substring(0, 200)}...\n\`\`\``);
      }
      
    } catch (error: any) {
      setAiAnalysis(`❌ **Error de red:** ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderTrend = (value: number, isGasto: boolean = false) => {
      if (filtroTiempo === 'all') return null;
      const isPositiveTrend = value >= 0;
      const isGood = isGasto ? !isPositiveTrend : isPositiveTrend;
      
      return (
          <span className={`text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded-md ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isPositiveTrend ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
          </span>
      );
  };

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

  const getHealthStatus = (margen: number) => {
      if (margen >= 20) return { label: 'ÓPTIMO', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
      if (margen >= 5) return { label: 'ESTABLE', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      return { label: 'PELIGRO RIESGO', color: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  };
  const health = getHealthStatus(kpis.margen);

  return (
    <>
      <Toaster position="bottom-right" richColors theme="light" />
      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative text-slate-800" translate="no">
          <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-40">
            <div className="flex items-center gap-2">
               <img src="/icon-192x192.png" alt="Logo" className="w-8 h-8 bg-white rounded-lg p-1 object-contain" />
               <span className="font-bold text-white tracking-tight">TaxGuard<span className="text-blue-500">AI</span></span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          {/* 🚀 SIDEBAR UNIFICADO Y CORREGIDO */}
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
              
              {/* SELECTOR DE EMPRESA CORREGIDO (NO SE CORTA EL TEXTO) */}
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/documentos" onClick={() => setIsSidebarOpen(false)}>
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

          <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
            {esLectura && (
              <BannerModoAsesor nombreCliente={nombreEspacioVisible(empresaId)} onSalir={salirModoAsesor} />
            )}
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Inteligencia</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Evaluación financiera predictiva para <span className="font-bold text-blue-600">{nombreEspacioVisible(empresaId)}</span>.</p>
              </div>
              <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
                 <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                     {[
                         { id: 'all', label: 'Histórico' },
                         { id: 'year', label: '12 Meses' },
                         { id: 'quarter', label: '3 Meses' },
                         { id: 'month', label: '30 Días' },
                         { id: 'week', label: '7 Días' }
                     ].map(f => (
                         <button 
                             key={f.id}
                             onClick={() => setFiltroTiempo(f.id)}
                             disabled={planActivo !== 'pro'} 
                             className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${filtroTiempo === f.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'} disabled:opacity-50`}
                         >
                             {f.label}
                         </button>
                     ))}
                 </div>
                 
                 <div className="flex flex-wrap gap-2 justify-end w-full">
                    <button onClick={() => generarAuditoria('General')} disabled={isAnalyzing || planActivo !== 'pro'} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-[11px] font-bold transition shadow-sm flex items-center gap-1.5">
                      ✨ Auditoría General
                    </button>
                    <button onClick={() => generarAuditoria('Fugas')} disabled={isAnalyzing || planActivo !== 'pro'} className="bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-[11px] font-bold transition shadow-sm flex items-center gap-1.5">
                      🩸 Detectar Fugas
                    </button>
                    <button onClick={() => generarAuditoria('Precios')} disabled={isAnalyzing || planActivo !== 'pro'} className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-[11px] font-bold transition shadow-sm flex items-center gap-1.5">
                      📈 Simular +10% Precio
                    </button>
                    <button onClick={() => generarAuditoria('Proyeccion')} disabled={isAnalyzing || planActivo !== 'pro'} className="bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-[11px] font-bold transition shadow-sm flex items-center gap-1.5">
                      🔮 Proyección a 30 Días
                    </button>
                 </div>
              </div>
            </header>

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
              <>
                {/* 🚀 FILA 1: KPIs GENERALES (AHORA MUESTRAN EL TOTAL REAL) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center mb-1">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Ingresos</span>
                         {!isLoadingData && renderTrend(trends.ingresos, false)}
                      </div>
                      {isLoadingData ? <Skeleton className="h-7 w-28 mt-0.5" /> : <span className="text-2xl font-black text-slate-800">{kpis.ingresos.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>}
                   </div>
                   
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center mb-1">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Gastos</span>
                         {!isLoadingData && renderTrend(trends.gastos, true)}
                      </div>
                      {isLoadingData ? <Skeleton className="h-7 w-28 mt-0.5" /> : <span className="text-2xl font-black text-rose-500">{kpis.gastos.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>}
                   </div>
                   
                   <div className={`p-5 rounded-2xl border flex flex-col justify-center ${kpis.beneficio >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div className="flex items-center mb-1">
                         <span className={`text-[10px] font-bold uppercase tracking-widest ${kpis.beneficio >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Beneficio (Bruto)</span>
                         {!isLoadingData && renderTrend(trends.beneficio, false)}
                      </div>
                      {isLoadingData ? <Skeleton className="h-7 w-28 mt-0.5" /> : (
                         <span className={`text-2xl font-black tracking-tight ${kpis.beneficio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {kpis.beneficio >= 0 ? '+' : ''}{kpis.beneficio.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                         </span>
                      )}
                   </div>
                   
                   <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Margen Operativo</span>
                      {isLoadingData ? <Skeleton className="h-7 w-20" /> : (
                         <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-blue-600">{kpis.margen.toFixed(1)}%</span>
                            <span className={`text-[9px] font-black px-2 py-1 rounded border flex items-center gap-1 uppercase tracking-wider ${health.color}`}>
                               <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`}></span> {health.label}
                            </span>
                         </div>
                      )}
                   </div>
                </div>

                {/* 🚀 FILA 2: MÉTRICAS ESTRATÉGICAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 rounded-2xl border border-indigo-500 flex flex-col justify-center text-white shadow-lg shadow-indigo-500/30">
                       <div className="flex items-center mb-1">
                          <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Caja Libre (Beneficio Líquido)</span>
                       </div>
                       {isLoadingData ? <Skeleton className="h-8 w-32 bg-white/20" /> : (
                          <span className="text-3xl font-black tracking-tight text-white">
                             {kpis.beneficioLiquido >= 0 ? '+' : ''}{kpis.beneficioLiquido.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                          </span>
                       )}
                       <span className="text-[10px] font-medium text-indigo-200 mt-1">Tu dinero real (Impuestos ya restados)</span>
                    </div>

                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 flex flex-col justify-center">
                       <div className="flex items-center mb-1 gap-1.5">
                          <span className="text-rose-500 text-sm">🏛️</span>
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Hucha Hacienda (Intocable)</span>
                       </div>
                       {isLoadingData ? <Skeleton className="h-7 w-28" /> : <span className="text-2xl font-black text-rose-600">{kpis.provisionImpuestos.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>}
                       <span className="text-[9px] font-bold text-rose-500 mt-1">Provisión calculada de IVA + IRPF</span>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-center text-white">
                       <div className="flex items-center mb-1 gap-1.5">
                          <span className="text-emerald-400 text-sm">🛡️</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supervivencia (Runway)</span>
                       </div>
                       {isLoadingData ? <Skeleton className="h-7 w-28 bg-slate-700" /> : <span className="text-2xl font-black text-white">{kpis.runwayMeses > 0 ? kpis.runwayMeses.toFixed(1) + ' Meses' : 'Riesgo Crítico'}</span>}
                       <span className="text-[9px] font-medium text-slate-500 mt-1">Vida del negocio con ingresos a cero</span>
                    </div>
                </div>

                {/* Centro de Riesgos + Simulación + Proyección */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Centro de Riesgos</h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{alertasRiesgo.length} alerta{alertasRiesgo.length === 1 ? '' : 's'}</span>
                    </div>
                    {isLoadingData ? (
                      <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
                    ) : alertasRiesgo.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700">
                        Sin alertas críticas en este momento. Liquidez y márgenes bajo control.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {alertasRiesgo.map((a, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border ${
                              a.tipo === 'critico'
                                ? 'bg-rose-50/70 border-rose-200'
                                : a.tipo === 'advertencia'
                                  ? 'bg-amber-50/70 border-amber-200'
                                  : 'bg-blue-50/70 border-blue-200'
                            }`}
                          >
                            <p className={`text-[11px] font-black uppercase tracking-wide mb-0.5 ${
                              a.tipo === 'critico' ? 'text-rose-700' : a.tipo === 'advertencia' ? 'text-amber-700' : 'text-blue-700'
                            }`}>{a.titulo}</p>
                            <p className={`text-[11px] font-medium leading-relaxed ${
                              a.tipo === 'critico' ? 'text-rose-600' : a.tipo === 'advertencia' ? 'text-amber-700' : 'text-blue-600'
                            }`}>{a.texto}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Simulación +10% precio</h3>
                    </div>
                    {isLoadingData ? (
                      <Skeleton className="h-32 w-full rounded-xl" />
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 font-medium mb-3">Hipótesis: precio +10% y volumen −5% en el periodo ({etiquetaFiltro}).</p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Beneficio actual</p>
                            <p className={`text-sm font-black ${simulacionPrecios.beneficioActual >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                              {simulacionPrecios.beneficioActual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{simulacionPrecios.margenActual.toFixed(1)}% margen</p>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="text-[9px] font-black text-emerald-600 uppercase">Tras simulación</p>
                            <p className={`text-sm font-black ${simulacionPrecios.beneficioSimulado >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {simulacionPrecios.beneficioSimulado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </p>
                            <p className="text-[10px] font-bold text-emerald-600/80 mt-0.5">{simulacionPrecios.margenSimulado.toFixed(1)}% margen</p>
                          </div>
                        </div>
                        <p className={`text-xs font-bold ${simulacionPrecios.deltaBeneficio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {simulacionPrecios.deltaBeneficio >= 0 ? '▲' : '▼'}{' '}
                          {Math.abs(simulacionPrecios.deltaBeneficio).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € vs actual
                        </p>
                      </>
                    )}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Proyección de caja</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mb-3">Saldo estimado a 30 / 60 / 90 días (recurrentes + media histórica).</p>
                    <div className="flex-1 min-h-[140px]">
                      {isLoadingData ? (
                        <Skeleton className="h-full w-full rounded-xl" />
                      ) : proyeccionCashflow.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={proyeccionCashflow} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} width={50} />
                            <RechartsTooltip
                              formatter={(value: any) => [`${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, undefined]}
                              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 11 }}
                            />
                            <Bar dataKey="Saldo" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">Sin base para proyectar</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top clientes del periodo */}
                {!isLoadingData && topClientes.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Concentración de ingresos · {etiquetaFiltro}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {topClientes.map((c, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">#{idx + 1}</p>
                          <p className="text-xs font-bold text-slate-800 truncate" title={c.nombre}>{c.nombre}</p>
                          <p className="text-sm font-black text-indigo-600 mt-1">
                            {c.importe.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">{c.pct.toFixed(1)}% del periodo</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                   <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px] xl:h-auto min-h-[450px]">
                      <div className="mb-6 flex items-center gap-2">
                         <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Evolución P&L (Mensual)</h3>
                      </div>
                      <div className="flex-1 w-full min-h-[300px]">
                         {isLoadingData ? (
                            <div className="h-full w-full flex items-end gap-3 px-2">
                               {[60, 85, 45, 70, 55, 90, 40].map((h, i) => <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />)}
                            </div>
                         ) : chartDataEvolucion.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={chartDataEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={60} />
                                  <RechartsTooltip 
                                     formatter={(value: any) => [`${Number(value).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €`, undefined]}
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
                         {isLoadingData ? (
                            <div className="h-full w-full flex items-center justify-center">
                               <Skeleton className="w-[180px] h-[180px] rounded-full" />
                            </div>
                         ) : chartDataGastos.length > 0 ? (
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
                                     <span className="text-slate-900">{gasto.value.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
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

                {/* 🚀 NUEVA SECCIÓN: RENTABILIDAD POR PROYECTO */}
                {chartDataProyectos.length > 0 && (
                   <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
                      <div className="flex items-center gap-2 mb-6">
                         <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Rentabilidad por Proyecto / Evento</h3>
                      </div>
                      <div className="overflow-x-auto">
                         <table className="min-w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                               <tr>
                                  <th className="px-4 py-3 rounded-tl-xl">Etiqueta de Proyecto</th>
                                  <th className="px-4 py-3 text-right">Ingresos Asignados</th>
                                  <th className="px-4 py-3 text-right">Costes Asignados</th>
                                  <th className="px-4 py-3 text-right">Beneficio Limpio</th>
                                  <th className="px-4 py-3 text-right rounded-tr-xl">Margen Real</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                               {chartDataProyectos.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                                     <td className="px-4 py-4">
                                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-black border border-purple-200 shadow-sm tracking-wide">
                                            🎯 {p.name}
                                        </span>
                                     </td>
                                     <td className="px-4 py-4 text-right text-emerald-600">+{p.ingresos.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                                     <td className="px-4 py-4 text-right text-rose-500">-{p.gastos.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                                     <td className={`px-4 py-4 text-right font-black ${p.margen >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{p.margen >= 0 ? '+' : ''}{p.margen.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                                     <td className="px-4 py-4 text-right">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-md font-black border ${p.rentabilidad >= 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.rentabilidad > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                           {p.rentabilidad.toFixed(1)}%
                                        </span>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                )}

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
                                  <p className="text-xs font-bold text-blue-600 uppercase mt-2 tracking-wide">
                                      MOTOR DE IA | ESCENARIO: {simulacionActiva}
                                  </p>
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

          <SoporteVIPModal open={showSupportModal} onClose={() => setShowSupportModal(false)} empresaId={nombreEspacioVisible(empresaId)} modulo="analisis" />

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