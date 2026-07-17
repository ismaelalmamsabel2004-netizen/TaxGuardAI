"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton, Show, SignInButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

import { obtenerDatosSupabase } from '../actions';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Roboto' },
  headerBox: { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 15, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleBox: { flexDirection: 'column' },
  title: { fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 10, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  aeatBox: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  aeatText: { fontSize: 9, fontWeight: 700, color: '#475569' },
  
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 15 },
  infoCol: { flexDirection: 'column' },
  infoLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 11, fontWeight: 700, color: '#0f172a' },
  
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#ffffff', backgroundColor: '#334155', paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10 },
  
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 5 },
  rowLabel: { fontSize: 10, color: '#334155', width: '40%' },
  
  boxGroup: { flexDirection: 'row', width: '60%', justifyContent: 'flex-end', gap: 15 },
  casillaBox: { flexDirection: 'row', alignItems: 'center', width: '30%', justifyContent: 'flex-end' },
  casillaNum: { fontSize: 8, color: '#94a3b8', marginRight: 4, fontWeight: 700 },
  casillaValue: { fontSize: 10, color: '#0f172a', fontWeight: 700 },
  
  totalDevengado: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 10, marginTop: 5, marginBottom: 20 },
  totalLabel: { fontSize: 10, fontWeight: 700, color: '#0f172a' },
  
  resultBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#eff6ff', borderLeftWidth: 4, borderLeftColor: '#2563eb', marginTop: 30 },
  resultLabel: { fontSize: 12, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' },
  resultValue: { fontSize: 18, fontWeight: 700, color: '#1d4ed8' },
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

const Borrador303PDF = ({ mod303, empresaId, trimestre, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBox}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 303</Text>
          <Text style={styles.subtitle}>Impuesto sobre el Valor Añadido</Text>
        </View>
        <View style={styles.aeatBox}>
          <Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Sujeto Pasivo</Text>
          <Text style={styles.infoValue}>{empresaId}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Ejercicio</Text>
          <Text style={styles.infoValue}>{anio}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Periodo</Text>
          <Text style={styles.infoValue}>{trimestre}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Fecha Generación</Text>
          <Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>LIQUIDACIÓN - IVA DEVENGADO</Text>
      
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen general (21%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[01]</Text>
             <Text style={styles.casillaValue}>{mod303.base21.toFixed(2)}</Text>
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[02]</Text>
             <Text style={styles.casillaValue}>21%</Text>
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[03]</Text>
             <Text style={styles.casillaValue}>{mod303.cuota21.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen reducido (10%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[04]</Text>
             <Text style={styles.casillaValue}>{mod303.base10.toFixed(2)}</Text>
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[05]</Text>
             <Text style={styles.casillaValue}>10%</Text>
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[06]</Text>
             <Text style={styles.casillaValue}>{mod303.cuota10.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen superreducido (4%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[07]</Text>
             <Text style={styles.casillaValue}>{mod303.base4.toFixed(2)}</Text>
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[08]</Text>
             <Text style={styles.casillaValue}>4%</Text>
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[09]</Text>
             <Text style={styles.casillaValue}>{mod303.cuota4.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.totalDevengado}>
        <Text style={styles.totalLabel}>Total cuota devengada</Text>
        <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[27]</Text>
             <Text style={styles.casillaValue}>{mod303.totalCuotaDevengada.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>LIQUIDACIÓN - IVA DEDUCIBLE</Text>

      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Por cuotas soportadas en op. interiores corrientes</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[28]</Text>
             <Text style={styles.casillaValue}>{mod303.baseDeducible.toFixed(2)}</Text>
          </View>
          <View style={styles.casillaBox}>
             {/* Espacio Vacío */}
          </View>
          <View style={styles.casillaBox}>
             <Text style={styles.casillaNum}>[29]</Text>
             <Text style={styles.casillaValue}>{mod303.cuotaDeducible.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.resultBox}>
        <View>
          <Text style={styles.resultLabel}>Resultado de la Liquidación</Text>
          <Text style={{fontSize: 8, color: '#64748b', marginTop: 4}}>Si es positivo, a ingresar. Si es negativo, a compensar o devolver.</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.casillaNum}>[71]</Text>
          <Text style={styles.resultValue}>{mod303.resultado.toFixed(2)} €</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Borrador generado por TaxGuard AI. Este documento no es válido para su presentación oficial.</Text>
        <Text style={styles.footerText}>Página 1 de 1</Text>
      </View>
    </Page>
  </Document>
);

export default function ModelosTributarios() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  
  const [planActivo, setPlanActivo] = useState('loading');

  const [trimestre, setTrimestre] = useState("1T");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [aniosDisponibles, setAniosDisponibles] = useState<string[]>([new Date().getFullYear().toString()]);

  useEffect(() => {
    setIsMounted(true);
    
    const mesActual = new Date().getMonth() + 1;
    if (mesActual <= 3) setTrimestre("1T");
    else if (mesActual <= 6) setTrimestre("2T");
    else if (mesActual <= 9) setTrimestre("3T");
    else setTrimestre("4T");

    if (!isLoaded) return;
    if (!isSignedIn) return;

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         
         if (planDetectado === 'free') {
            router.push('/precios');
            return; 
         }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Alperez"];
         setEmpresas(listaEmpresas);
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);

         if (activa) {
           obtenerDatosSupabase(activa).then(d => {
                setData(d);
                if (d.length > 0) {
                    const aniosUnicos = new Set<string>();
                    d.forEach((item: any) => {
                        const [, , year] = item.name.split('/');
                        if (year) aniosUnicos.add(year);
                    });
                    aniosUnicos.add(new Date().getFullYear().toString());
                    const aniosOrdenados = Array.from(aniosUnicos).sort((a, b) => Number(b) - Number(a));
                    setAniosDisponibles(aniosOrdenados);
                }
           });
         }
      });
  }, [isLoaded, isSignedIn, router]);

  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    setEmpresaId(nuevaEmpresa);
    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actuales, empresaActiva: nuevaEmpresa })
    });

    obtenerDatosSupabase(nuevaEmpresa).then(d => {
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
    });
  };

  const calcularModelo303 = () => {
    const datosTrimestre = data.filter(d => {
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

    const base21 = ingresos.filter(i => Number(i.iva) === 21).reduce((acc, curr) => acc + Number(curr.total), 0);
    const cuota21 = base21 * 0.21;
    const base10 = ingresos.filter(i => Number(i.iva) === 10).reduce((acc, curr) => acc + Number(curr.total), 0);
    const cuota10 = base10 * 0.10;
    const base4 = ingresos.filter(i => Number(i.iva) === 4).reduce((acc, curr) => acc + Number(curr.total), 0);
    const cuota4 = base4 * 0.04;
    const totalCuotaDevengada = cuota21 + cuota10 + cuota4;

    const baseDeducible = gastos.reduce((acc, curr) => acc + Math.abs(Number(curr.total)), 0);
    const cuotaDeducible = gastos.reduce((acc, curr) => {
       const tipoIva = Number(curr.iva) || 0;
       return acc + (Math.abs(Number(curr.total)) * (tipoIva / 100));
    }, 0);

    const resultado = totalCuotaDevengada - cuotaDeducible;

    return { base21, cuota21, base10, cuota10, base4, cuota4, totalCuotaDevengada, baseDeducible, cuotaDeducible, resultado };
  };

  const mod303 = calcularModelo303();

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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
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
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modelos Oficiales</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Gestión fiscal inteligente lista para copiar y pegar en Hacienda.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
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
                 
                 <select 
                   value={anio} 
                   onChange={(e) => setAnio(e.target.value)}
                   disabled={planActivo !== 'pro'}
                   className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm outline-none disabled:opacity-50"
                 >
                   {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>

                 {planActivo === 'pro' && isMounted ? (
                    <PDFDownloadLink 
                       document={<Borrador303PDF mod303={mod303} empresaId={empresaId} trimestre={trimestre} anio={anio} />} 
                       fileName={`Modelo303_Borrador_${empresaId.replace(/\s+/g, '')}_${trimestre}_${anio}.pdf`}
                    >
                       {/* @ts-ignore */}
                       {({ loading }) => (
                          <button disabled={loading} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                             {loading ? "Generando PDF..." : "Descargar Borrador Oficial"}
                          </button>
                       )}
                    </PDFDownloadLink>
                 ) : (
                    <button disabled className="w-full sm:w-auto bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-50">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       Descargar Borrador Oficial
                    </button>
                 )}
              </div>
            </header>

            {/* MURO DE PAGO PARA EL MODELO 303 (SOLO PLAN PRO) */}
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
                         La generación automática del Modelo 303 (IVA Trimestral) cruzado con tus Libros Mayores está reservada para el Plan Empresa Pro. Olvídate de la calculadora.
                      </p>
                      <Link href="/precios" className="bg-orange-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition hover:-translate-y-1 flex items-center gap-2">
                         ⭐ Mejorar a Plan Empresa Pro
                      </Link>
                   </div>
                </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                 <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                    <div className="bg-orange-500 p-6 md:p-8 text-white">
                       <h2 className="text-2xl font-black tracking-tight">Modelo 303</h2>
                       <p className="font-medium text-orange-100 mt-1">Borrador interno calculado en tiempo real para <strong>{empresaId}</strong></p>
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
              </div>
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