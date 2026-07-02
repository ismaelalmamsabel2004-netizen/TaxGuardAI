"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';
import Link from 'next/link';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("Cargando auditoría de rendimiento...");
  const [data, setData] = useState<{id?: number, name: string, total: number, categoria?: string}[]>([]);
 
  const [empresas, setEmpresas] = useState<string[]>(["Alperez", "PetClean", "Techmovile"]);
  const [empresaId, setEmpresaId] = useState("Alperez");
  const [nuevaEmpresa, setNuevaEmpresa] = useState("");

  const [mes, setMes] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [tipoTransaccion, setTipoTransaccion] = useState<"ingreso" | "gasto">("ingreso");
  
  const categoriasIngreso = ["Ventas", "Servicios", "Inversión", "Otros"];
  const categoriasGasto = ["Logística", "Marketing", "Software/Suscripciones", "Inventario/Materiales", "Nóminas", "Otros"];
  const [categoria, setCategoria] = useState(categoriasIngreso[0]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [filtro, setFiltro] = useState("all");

  const [metaMensual, setMetaMensual] = useState(5000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState("5000");

  // 🆕 EL BLINDAJE ANTI-CRASH PARA LOS GRÁFICOS
  const [graficosKey, setGraficosKey] = useState(Date.now());

  const COLORES_DONA = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCategoria(tipoTransaccion === 'ingreso' ? categoriasIngreso[0] : categoriasGasto[0]);
  }, [tipoTransaccion]);

  const agregarEmpresa = () => {
    if (nuevaEmpresa && !empresas.includes(nuevaEmpresa)) {
      const lista = [...empresas, nuevaEmpresa];
      setEmpresas(lista);
      localStorage.setItem('taxguard_empresas', JSON.stringify(lista));
      setNuevaEmpresa("");
    }
  };

  const eliminarEmpresa = (nombre: string) => {
    const lista = empresas.filter(e => e !== nombre);
    setEmpresas(lista);
    localStorage.setItem('taxguard_empresas', JSON.stringify(lista));
    if (empresaId === nombre) setEmpresaId(lista[0] || "");
  };

  useEffect(() => {
    const guardadas = localStorage.getItem('taxguard_empresas');
    if (guardadas) setEmpresas(JSON.parse(guardadas));
  }, []);

  useEffect(() => {
    const metasGuardadas = localStorage.getItem('taxguard_metas');
    if (metasGuardadas) {
      const metas = JSON.parse(metasGuardadas);
      if (metas[empresaId]) {
        setMetaMensual(metas[empresaId]);
        setInputMeta(metas[empresaId].toString());
      } else {
        setMetaMensual(5000);
        setInputMeta("5000");
      }
    }
  }, [empresaId]);

  const guardarNuevaMeta = () => {
    const nuevaMetaNum = Number(inputMeta);
    if (nuevaMetaNum > 0) {
      setMetaMensual(nuevaMetaNum);
      const metasGuardadas = localStorage.getItem('taxguard_metas');
      const metas = metasGuardadas ? JSON.parse(metasGuardadas) : {};
      metas[empresaId] = nuevaMetaNum;
      localStorage.setItem('taxguard_metas', JSON.stringify(metas));
    }
    setEditandoMeta(false);
  };

  const ordenarPorFecha = (datos: any[]) => {
    return [...datos].sort((a, b) => {
      const pA = a.name.split('/');
      const pB = b.name.split('/');
      const fechaA = new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime();
      const fechaB = new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime();
      return fechaA - fechaB;
    });
  };

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

  const datosVisibles = filtrarDatos(data, filtro);

  const datosGrafico = datosVisibles.reduce((acc: {name: string, total: number}[], curr: any) => {
    const existente = acc.find((item: any) => item.name === curr.name);
    if (existente) {
      existente.total += curr.total;
    } else {
      acc.push({ name: curr.name, total: curr.total });
    }
    return acc;
  }, [] as { name: string, total: number }[]);

  const gastosPorCategoria = datosVisibles
    .filter(d => d.total < 0)
    .reduce((acc: {name: string, value: number}[], curr: any) => {
      const cat = curr.categoria || 'General';
      const existente = acc.find((item: any) => item.name === cat);
      if (existente) {
        existente.value += Math.abs(curr.total);
      } else {
        acc.push({ name: cat, value: Math.abs(curr.total) });
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const ingresosTotales = datosVisibles.filter(d => d.total > 0).reduce((sum, item) => sum + item.total, 0);
  const gastosTotales = datosVisibles.filter(d => d.total < 0).reduce((sum, item) => sum + Math.abs(item.total), 0);
  const beneficioNeto = ingresosTotales - gastosTotales;
  const porcentajeMeta = Math.min(Math.round((ingresosTotales / metaMensual) * 100), 100);

  const cambiarFiltro = (nuevoFiltro: string) => {
    setFiltro(nuevoFiltro);
    const datosFiltrados = filtrarDatos(data, nuevoFiltro);
    pedirAnalisisGemini(datosFiltrados);
  };

  useEffect(() => {
    fetch(`/api/finances?empresaId=${empresaId}`)
      .then(res => res.ok ? res.json() : [])
      .then(d => {
        if (d && d.length > 0) {
          const ordenados = ordenarPorFecha(d);
          setData(ordenados);
          setGraficosKey(Date.now()); // Reseteo de gráficos al cargar la empresa
          pedirAnalisisGemini(ordenados);
        } else {
          setData([]);
          setGraficosKey(Date.now()); // Reseteo de gráficos
          setAiAnalysis("Sistema listo. Ingrese registros para activar la auditoría automatizada.");
        }
      });
  }, [empresaId]);

  const guardarDato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mes || !ingreso) return;
    setIsSaving(true);
    
    try {
      const [y, m, d] = mes.split('-');
      const fecha = `${d}/${m}/${y}`;
     
      const valorNumerico = Math.abs(Number(ingreso));
      const valorFinal = tipoTransaccion === 'gasto' ? -valorNumerico : valorNumerico;
     
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ month: fecha, total: valorFinal, empresaId, categoria }) 
      });

      if (res.ok) {
        const resRefresh = await fetch(`/api/finances?empresaId=${empresaId}`);
        const actualizadosBD = await resRefresh.json();
        
        const ordenados = ordenarPorFecha(actualizadosBD);
        setData(ordenados);
        setGraficosKey(Date.now()); // 🆕 Reseteo FORZADO del lienzo al guardar un dato
        setIngreso('');
       
        const filtrados = filtrarDatos(ordenados, filtro);
        pedirAnalisisGemini(filtrados);
      } else {
        alert("Ocurrió un error al intentar guardar en la base de datos.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const eliminarDato = async (id: number) => {
    const res = await fetch(`/api/finances?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      const restantes = data.filter(item => item.id !== id);
      setData(restantes);
      setGraficosKey(Date.now()); // 🆕 Reseteo FORZADO al borrar un dato
     
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
    setAiAnalysis("Procesando balance de ingresos y gastos operativos...");
    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: d, empresaId }), 
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
    let csvContent = "Fecha,Categoría,Tipo,Importe (EUR)\n";
    datosVisibles.forEach(row => {
      const tipoTxt = row.total >= 0 ? "Ingreso" : "Gasto";
      const catTxt = row.categoria || "General";
      csvContent += `${row.name},${catTxt},${tipoTxt},${row.total}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Balance_TaxGuardAI_${filtro}.csv`);
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
             
              <div className="mb-6 px-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
                <div className="flex gap-2 mt-1">
                    <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none">
                        {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button onClick={() => eliminarEmpresa(empresaId)} className="p-2.5 bg-rose-900/30 text-rose-500 rounded-xl hover:bg-rose-900">×</button>
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={nuevaEmpresa} onChange={(e) => setNuevaEmpresa(e.target.value)} placeholder="Añadir..." className="w-full bg-slate-800 p-2 text-xs text-white rounded-lg border border-slate-700 outline-none" />
                  <button onClick={agregarEmpresa} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">+</button>
                </div>
              </div>
             
              <nav className="space-y-1">
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium transition shadow-sm" href="/">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Análisis Avanzado
                </Link>
              </nav>
            </div>
           
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
              <UserButton/>
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

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Objetivo de Ingresos ({filtro === 'all' ? 'Histórico' : filtro === 'month' ? 'Mensual' : filtro === 'quarter' ? 'Trimestral' : 'Anual'})</h3>
                  <p className="text-xs text-slate-400">Rendimiento de facturación para el espacio actual.</p>
                </div>
                <div className="text-right">
                  {editandoMeta ? (
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={inputMeta} 
                        onChange={(e) => setInputMeta(e.target.value)} 
                        className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                      />
                      <button onClick={guardarNuevaMeta} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition">
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end cursor-pointer group" onClick={() => setEditandoMeta(true)}>
                      <span className="text-2xl font-black text-slate-900">
                        {ingresosTotales.toLocaleString()} € <span className="text-sm font-medium text-slate-400">/ {metaMensual.toLocaleString()} €</span>
                      </span>
                      <span className="text-[10px] font-bold text-blue-500 uppercase group-hover:underline mt-1">Editar Meta</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-1000 ${porcentajeMeta >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                  style={{ width: `${porcentajeMeta}%` }}
                ></div>
              </div>
              <p className="text-right text-xs font-bold text-slate-500 mt-2">{porcentajeMeta}% Alcanzado</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingresos Brutos</span>
                <span className="text-3xl font-black text-emerald-500 tracking-tight mt-3">+ {ingresosTotales.toLocaleString()} €</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gastos Operativos</span>
                <span className="text-3xl font-black text-rose-500 tracking-tight mt-3">- {gastosTotales.toLocaleString()} €</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${beneficioNeto >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Beneficio Neto</span>
                <span className={`text-3xl font-black tracking-tight mt-3 ml-2 ${beneficioNeto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {beneficioNeto.toLocaleString()} €
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Asistente de Transacciones</h3>
                  <p className="text-xs text-slate-400 mb-6">Registre movimientos en el flujo de caja.</p>
                  
                  <form onSubmit={guardarDato} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button 
                        type="button" 
                        onClick={() => setTipoTransaccion('ingreso')} 
                        className={`py-2 rounded-xl text-xs font-bold transition border ${tipoTransaccion === 'ingreso' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                      >
                        + Ingreso
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTipoTransaccion('gasto')} 
                        className={`py-2 rounded-xl text-xs font-bold transition border ${tipoTransaccion === 'gasto' ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                      >
                        - Gasto
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Operativa</label>
                      <input type="date" value={mes} onChange={(e) => setMes(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoría</label>
                      <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer">
                        {(tipoTransaccion === 'ingreso' ? categoriasIngreso : categoriasGasto).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Importe Neto (€)</label>
                      <input type="number" placeholder="Ej: 500" value={ingreso} onChange={(e) => setIngreso(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm shadow-slate-900/10 disabled:opacity-50 mt-2">
                      {isSaving ? "Procesando..." : "Asignar Movimiento"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[350px]">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Balance Visual del Periodo</h3>
                  <p className="text-xs text-slate-400 mb-6">Comparativa de márgenes operativos a lo largo del tiempo.</p>
                </div>
                {/* 🆕 KEY VINCULADA PARA FORZAR EL RENDERIZADO LIMPIO */}
                {isMounted && (
                  <div className="flex-1 min-h-[220px]" key={`bar-container-${empresaId}-${filtro}-${graficosKey}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} isAnimationActive={false} />
                        
                        <Bar dataKey="total" radius={[6, 6, 6, 6]} maxBarSize={45} isAnimationActive={false}>
                          {datosGrafico.map((entry: any, index: number) => (
                            <Cell key={`bar-cell-${entry.name}-${index}`} fill={entry.total >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Distribución de Gastos</h3>
                  <p className="text-xs text-slate-400 mb-2">Desglose porcentual por categorías.</p>
                </div>
                <div className="flex-1 w-full h-[200px] flex items-center justify-center">
                  {isMounted && gastosPorCategoria.length > 0 ? (
                    <div className="w-full h-full" key={`pie-container-${empresaId}-${filtro}-${graficosKey}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gastosPorCategoria}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={false}
                          >
                            {gastosPorCategoria.map((entry, index) => (
                              <Cell key={`pie-cell-${entry.name}-${index}`} fill={COLORES_DONA[index % COLORES_DONA.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} €`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} isAnimationActive={false} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, color: '#64748b', paddingTop: '10px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-300">No hay gastos en este periodo.</span>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 className="text-md font-bold text-slate-900">Auditoría Financiera Gemini</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Diagnóstico de márgenes y salud económica.</p>
                </div>
                
                <div className="flex-1 bg-slate-50/50 rounded-xl p-6 border border-slate-200/60 overflow-y-auto max-h-[220px]">
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Libro Mayor Integrado</h3>
                  <p className="text-xs text-slate-400">Registro detallado de transacciones corporativas.</p>
                </div>
                <button onClick={exportarAExcel} className="flex items-center gap-2 text-xs font-bold bg-slate-50 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition border border-slate-200 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  CSV
                </button>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Categoría</th>
                      <th className="px-6 py-3">Monto</th>
                      <th className="px-6 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {datosVisibles.map((item: any, index: number) => (
                      <tr key={`row-${item.id || 'temp'}-${index}`} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-3.5 text-slate-600">{item.name}</td>
                        
                        <td className="px-6 py-3.5">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {item.categoria || 'General'}
                          </span>
                        </td>

                        <td className={`px-6 py-3.5 font-bold ${item.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {item.total >= 0 ? '+' : '-'} {Math.abs(item.total).toLocaleString()} €
                        </td>
                        
                        <td className="px-6 py-3.5 text-right">
                          <button onClick={() => item.id && eliminarDato(item.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition" title="Eliminar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {datosVisibles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-400">Sin movimientos en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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