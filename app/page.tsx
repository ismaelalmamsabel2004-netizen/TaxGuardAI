"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef } from "react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';
import Link from 'next/link';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("Pulse 'Generar Reporte' para iniciar la evaluación inteligente de este periodo.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [data, setData] = useState<{id?: number, name: string, total: number, categoria?: string, isRecurrent?: boolean, frecuencia?: string, iva?: number}[]>([]);
 
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresaId, setEmpresaId] = useState(""); 
  const [nuevaEmpresa, setNuevaEmpresa] = useState("");
  const [papelera, setPapelera] = useState<{nombre: string, fecha: number}[]>([]);

  const [mes, setMes] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [tipoTransaccion, setTipoTransaccion] = useState<"ingreso" | "gasto">("ingreso");
  
  const defaultIngresos = ["Ventas", "Servicios", "Inversión", "Subvenciones", "Préstamos", "Otros"];
  const defaultGastos = ["Logística", "Marketing", "Software/Suscripciones", "Inventario/Materiales", "Nóminas", "Impuestos", "Dietas", "Mantenimiento", "Seguros", "Otros"];

  const [categoriasIngreso, setCategoriasIngreso] = useState(defaultIngresos);
  const [categoriasGasto, setCategoriasGasto] = useState(defaultGastos);
  const [categoria, setCategoria] = useState(categoriasIngreso[0]);
  
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [frecuencia, setFrecuencia] = useState("Mensual");
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");

  const [isSaving, setIsSaving] = useState(false);
  const [filtro, setFiltro] = useState("all");

  const etiquetasFiltro: Record<string, string> = {
    all: "Histórico Completo",
    month: "Último Mes",
    quarter: "Último Trimestre",
    year: "Último Año"
  };

  const [metaMensual, setMetaMensual] = useState(5000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState("5000");

  const [showNotifications, setShowNotifications] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [perfilEmpresa, setPerfilEmpresa] = useState({ sector: "", objetivo: "" });
  const [sectorInput, setSectorInput] = useState("");
  const [objetivoInput, setObjetivoInput] = useState("");

  const [catsIngresoInput, setCatsIngresoInput] = useState(defaultIngresos.join(", "));
  const [catsGastoInput, setCatsGastoInput] = useState(defaultGastos.join(", "));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const COLORES_DONA = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9', '#d946ef', '#14b8a6'];

  useEffect(() => { 
    setIsMounted(true); 
    const guardadas = localStorage.getItem('taxguard_empresas');
    const lista = guardadas ? JSON.parse(guardadas) : ["Alperez", "PetClean", "Techmovile"];
    setEmpresas(lista);

    const papeleraGuardada = localStorage.getItem('taxguard_papelera');
    if (papeleraGuardada) setPapelera(JSON.parse(papeleraGuardada));

    const activa = localStorage.getItem('taxguard_empresaActiva');
    if (activa && lista.includes(activa)) {
      setEmpresaId(activa);
    } else {
      setEmpresaId(lista[0] || "");
      if (lista[0]) localStorage.setItem('taxguard_empresaActiva', lista[0]);
    }
  }, []);

  useEffect(() => {
    setCategoria(tipoTransaccion === 'ingreso' ? categoriasIngreso[0] : categoriasGasto[0]);
  }, [tipoTransaccion, categoriasIngreso, categoriasGasto]);

  const agregarEmpresa = () => {
    if (nuevaEmpresa && !empresas.includes(nuevaEmpresa)) {
      const lista = [...empresas, nuevaEmpresa];
      setEmpresas(lista);
      localStorage.setItem('taxguard_empresas', JSON.stringify(lista));
      setEmpresaId(nuevaEmpresa);
      localStorage.setItem('taxguard_empresaActiva', nuevaEmpresa);
      setNuevaEmpresa("");
    }
  };

  const eliminarEmpresa = (nombre: string) => {
    const confirmacion = window.confirm(`⚠️ ATENCIÓN: ¿Estás seguro de que deseas borrar el espacio de trabajo "${nombre}"?\n\nLos datos se guardarán en la papelera de reciclaje durante 7 días antes de su eliminación definitiva.`);
    if (!confirmacion) return;

    const nuevaPapelera = [...papelera, { nombre, fecha: Date.now() }];
    setPapelera(nuevaPapelera);
    localStorage.setItem('taxguard_papelera', JSON.stringify(nuevaPapelera));

    const lista = empresas.filter(e => e !== nombre);
    setEmpresas(lista);
    localStorage.setItem('taxguard_empresas', JSON.stringify(lista));
    
    if (empresaId === nombre) {
      const nuevaActiva = lista[0] || "";
      setEmpresaId(nuevaActiva);
      localStorage.setItem('taxguard_empresaActiva', nuevaActiva);
    }
  };

  const recuperarDePapelera = (nombre: string) => {
    const lista = [...empresas, nombre];
    setEmpresas(lista);
    localStorage.setItem('taxguard_empresas', JSON.stringify(lista));

    const nuevaPapelera = papelera.filter(item => item.nombre !== nombre);
    setPapelera(nuevaPapelera);
    localStorage.setItem('taxguard_papelera', JSON.stringify(nuevaPapelera));

    setEmpresaId(nombre);
    localStorage.setItem('taxguard_empresaActiva', nombre);
    alert(`✅ El espacio "${nombre}" ha sido restaurado con éxito.`);
  };

  useEffect(() => {
    if (!empresaId) return; 

    const metasGuardadas = localStorage.getItem('taxguard_metas');
    if (metasGuardadas) {
      const metas = JSON.parse(metasGuardadas);
      setMetaMensual(metas[empresaId] ? metas[empresaId] : 5000);
      setInputMeta(metas[empresaId] ? metas[empresaId].toString() : "5000");
    } else {
      setMetaMensual(5000);
      setInputMeta("5000");
    }

    const perfilesGuardados = localStorage.getItem('taxguard_perfiles');
    if (perfilesGuardados) {
      const perfiles = JSON.parse(perfilesGuardados);
      if (perfiles[empresaId]) {
        setPerfilEmpresa(perfiles[empresaId]);
        setSectorInput(perfiles[empresaId].sector);
        setObjetivoInput(perfiles[empresaId].objetivo);
      } else {
        setPerfilEmpresa({ sector: "", objetivo: "" });
        setSectorInput("");
        setObjetivoInput("");
      }
    } else {
      setPerfilEmpresa({ sector: "", objetivo: "" });
      setSectorInput("");
      setObjetivoInput("");
    }

    const catGuardadas = localStorage.getItem('taxguard_categorias');
    if (catGuardadas) {
      const cat = JSON.parse(catGuardadas);
      if (cat[empresaId]) {
        setCategoriasIngreso(cat[empresaId].ingreso);
        setCategoriasGasto(cat[empresaId].gasto);
        setCatsIngresoInput(cat[empresaId].ingreso.join(", "));
        setCatsGastoInput(cat[empresaId].gasto.join(", "));
      } else {
        setCategoriasIngreso(defaultIngresos);
        setCategoriasGasto(defaultGastos);
        setCatsIngresoInput(defaultIngresos.join(", "));
        setCatsGastoInput(defaultGastos.join(", "));
      }
    } else {
      setCategoriasIngreso(defaultIngresos);
      setCategoriasGasto(defaultGastos);
      setCatsIngresoInput(defaultIngresos.join(", "));
      setCatsGastoInput(defaultGastos.join(", "));
    }

    setChatMessages([]);
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

  const guardarPerfil = () => {
    const nuevoPerfil = { sector: sectorInput, objetivo: objetivoInput };
    setPerfilEmpresa(nuevoPerfil);
    
    const perfilesGuardados = localStorage.getItem('taxguard_perfiles');
    const perfiles = perfilesGuardados ? JSON.parse(perfilesGuardados) : {};
    perfiles[empresaId] = nuevoPerfil;
    localStorage.setItem('taxguard_perfiles', JSON.stringify(perfiles));

    const nuevasIngreso = catsIngresoInput.split(',').map(c => c.trim()).filter(c => c);
    const nuevasGasto = catsGastoInput.split(',').map(c => c.trim()).filter(c => c);
    
    const catA_Guardar = {
       ingreso: nuevasIngreso.length > 0 ? nuevasIngreso : defaultIngresos,
       gasto: nuevasGasto.length > 0 ? nuevasGasto : defaultGastos
    };
    
    setCategoriasIngreso(catA_Guardar.ingreso);
    setCategoriasGasto(catA_Guardar.gasto);
    
    const catGuardadas = localStorage.getItem('taxguard_categorias');
    const catMemoria = catGuardadas ? JSON.parse(catGuardadas) : {};
    catMemoria[empresaId] = catA_Guardar;
    localStorage.setItem('taxguard_categorias', JSON.stringify(catMemoria));
    
    setShowConfig(false);
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

  const datosCronologicos = [...datosVisibles].sort((a, b) => {
    const pA = a.name.split('/');
    const pB = b.name.split('/');
    return new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime() - new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime();
  });

  const datosGrafico = datosCronologicos.reduce((acc: {name: string, total: number}[], curr: any) => {
    let clave = curr.name;
    if (filtro === 'year' || filtro === 'quarter') {
      const partes = curr.name.split('/'); 
      clave = `${partes[1]}/${partes[2]}`; 
    }
    const existente = acc.find((item: any) => item.name === clave);
    if (existente) existente.total += curr.total;
    else acc.push({ name: clave, total: curr.total });
    return acc;
  }, [] as { name: string, total: number }[]);

  const datosTabla = [...datosVisibles].sort((a, b) => {
    const pA = a.name.split('/');
    const pB = b.name.split('/');
    return new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime() - new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime();
  });

  const gastosPorCategoria = datosVisibles
    .filter(d => d.total < 0)
    .reduce((acc: {name: string, value: number}[], curr: any) => {
      const cat = curr.categoria || 'General';
      const existente = acc.find((item: any) => item.name === cat);
      if (existente) existente.value += Math.abs(curr.total);
      else acc.push({ name: cat, value: Math.abs(curr.total) });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const ingresosTotales = datosVisibles.filter(d => d.total > 0).reduce((sum, item) => sum + item.total, 0);
  const gastosTotales = datosVisibles.filter(d => d.total < 0).reduce((sum, item) => sum + Math.abs(item.total), 0);
  const beneficioNeto = ingresosTotales - gastosTotales;
  const porcentajeMeta = Math.min(Math.round((ingresosTotales / metaMensual) * 100), 100);

  const ivaRepercutido = datosVisibles.filter(d => d.total > 0).reduce((sum, item) => sum + (item.total * ((item.iva || 0) / 100)), 0);
  const ivaSoportado = datosVisibles.filter(d => d.total < 0).reduce((sum, item) => sum + (Math.abs(item.total) * ((item.iva || 0) / 100)), 0);
  const liquidacionIva = ivaRepercutido - ivaSoportado;

  const generarAlertas = () => {
    const alertas: { tipo: string, titulo: string, texto: string }[] = [];
    if (datosVisibles.length === 0) return alertas;

    if (beneficioNeto < 0) {
      alertas.push({ tipo: 'critico', titulo: '🚨 Flujo de Caja Negativo', texto: `Las salidas superan a las entradas en ${Math.abs(beneficioNeto).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €. Riesgo de liquidez.` });
    } 
    else if (ingresosTotales > 0 && gastosTotales > (ingresosTotales * 0.75)) {
      alertas.push({ tipo: 'advertencia', titulo: '⚠️ Alerta de Márgenes', texto: `El margen es estrecho. Los costes consumen más del 75% de lo facturado.` });
    }

    if (gastosPorCategoria.length > 0 && gastosTotales > 0) {
      const gastoPrincipal = gastosPorCategoria[0];
      const porcentaje = Math.round((gastoPrincipal.value / gastosTotales) * 100);
      if (porcentaje >= 50) {
        alertas.push({ tipo: 'info', titulo: '📊 Desviación de Costes', texto: `La categoría '${gastoPrincipal.name}' representa un ${porcentaje}% de los gastos.` });
      }
    }

    if (porcentajeMeta >= 100) {
      alertas.push({ tipo: 'exito', titulo: '🏆 Objetivo Superado', texto: `¡Enhorabuena! Has superado los ${metaMensual.toLocaleString()} € de ingresos.` });
    }
    
    if (liquidacionIva > 3000) {
      alertas.push({ tipo: 'advertencia', titulo: '🏛️ Provisión de Impuestos', texto: `Recuerda apartar liquidez. Tienes una estimación de ${liquidacionIva.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} € a devolver a Hacienda por IVA.` });
    }

    return alertas;
  };

  const alertasDinamicas = generarAlertas();

  useEffect(() => {
    if (!empresaId) return; 

    setData([]);
    setAiAnalysis("Pulse 'Generar Reporte' para iniciar la evaluación inteligente de este periodo.");
    
    fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`)
      .then(res => res.ok ? res.json() : [])
      .then(d => {
        if (d && d.length > 0) setData(d);
        else setData([]);
      });
  }, [empresaId]);

  const escanearFactura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, categorias: categoriasGasto })
        });

        if (res.ok) {
          const extraido = await res.json();
          setTipoTransaccion('gasto'); 
          if (extraido.fecha) setMes(extraido.fecha);
          if (extraido.base_imponible) setIngreso(extraido.base_imponible.toString());
          if (extraido.iva !== undefined) setIvaSeleccionado(extraido.iva.toString());
          
          if (extraido.categoria && categoriasGasto.includes(extraido.categoria)) {
             setCategoria(extraido.categoria);
          } else {
             setCategoria(categoriasGasto[0]);
          }
        } else {
          alert("La IA no pudo leer la factura con claridad. Asegúrate de que la foto tenga buena luz.");
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión al escanear.");
      } finally {
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
  };

  // 🚀 FUNCIÓN DE GUARDADO TOTALMENTE BLINDADA PARA MÓVILES
  const guardarDato = async (e: React.FormEvent) => {
    e.preventDefault(); // Previene que la página se recargue por error en móviles
    
    if (!empresaId) {
       alert("⚠️ Por favor, selecciona o crea un Espacio de Trabajo arriba a la izquierda.");
       return;
    }
    if (!mes) {
       alert("⚠️ Por favor, selecciona una fecha operativa.");
       return;
    }
    if (!ingreso) {
       alert("⚠️ Por favor, introduce un importe en Base Imponible.");
       return;
    }

    setIsSaving(true);
    
    try {
      const [y, m, d] = mes.split('-');
      const fecha = `${d}/${m}/${y}`;
      
      // Filtramos comas, espacios y letras que el teclado del móvil pueda meter por error
      const textoLimpio = ingreso.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      const numeroLimpio = parseFloat(textoLimpio);

      if (isNaN(numeroLimpio)) {
         setIsSaving(false);
         alert("⚠️ El importe introducido no es válido. Usa solo números.");
         return;
      }

      const valorFinal = tipoTransaccion === 'gasto' ? -Math.abs(numeroLimpio) : Math.abs(numeroLimpio);
     
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ month: fecha, total: valorFinal, empresaId, categoria, isRecurrent, frecuencia: isRecurrent ? frecuencia : null, iva: ivaSeleccionado }) 
      });

      if (res.ok) {
        const resRefresh = await fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`);
        const actualizadosBD = await resRefresh.json();
        setData(actualizadosBD);
        setIngreso('');
        setIsRecurrent(false);
        setFrecuencia('Mensual');
        setIvaSeleccionado("21"); 
      } else {
        alert("⚠️ Fallo en el servidor de la nube. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error(error);
      alert("⚠️ Error de conexión a internet al intentar guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const eliminarDato = async (id: number) => {
    const res = await fetch(`/api/finances?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      const restantes = data.filter(item => item.id !== id);
      setData(restantes);
    }
  };

  const iniciarEdicion = (item: any) => {
    setEditingId(item.id);
    const [d, m, y] = item.name.split('/');
    setEditFormData({
      tipo: item.total >= 0 ? 'ingreso' : 'gasto',
      mes: `${y}-${m}-${d}`,
      ingreso: Math.abs(item.total).toString(),
      categoria: item.categoria || 'General',
      ivaSeleccionado: item.iva?.toString() || '0'
    });
  };

  const guardarEdicion = async (id: number) => {
    try {
      const [y, m, d] = editFormData.mes.split('-');
      const fecha = `${d}/${m}/${y}`;
      const numeroLimpio = parseFloat(editFormData.ingreso.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      
      if (isNaN(numeroLimpio)) return alert("⚠️ El importe introducido no es válido.");

      const valorFinal = editFormData.tipo === 'gasto' ? -Math.abs(numeroLimpio) : Math.abs(numeroLimpio);

      const res = await fetch('/api/finances', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          id: id, 
          month: fecha, 
          total: valorFinal, 
          categoria: editFormData.categoria, 
          iva: editFormData.ivaSeleccionado 
        }) 
      });

      if (res.ok) {
        const resRefresh = await fetch(`/api/finances?empresaId=${empresaId}&t=${Date.now()}`);
        const actualizadosBD = await resRefresh.json();
        setData(actualizadosBD);
        setEditingId(null);
      }
    } catch (error) {
      alert("⚠️ Error al actualizar el dato");
    }
  };

  const pedirAnalisisGemini = (datosParaAnalizar: any[]) => {
    if (datosParaAnalizar.length < 2) {
      setAiAnalysis("Muestras insuficientes en este periodo para generar una proyección.");
      return;
    }
    setIsAnalyzing(true);
    setAiAnalysis("Procesando balance de ingresos y gastos operativos con perfil corporativo...");
    
    const datosLimpios = datosParaAnalizar.map(d => ({
      fecha: d.name,
      categoria: d.categoria || 'General',
      importe: d.total,
      iva_aplicado: d.iva ? `${d.iva}%` : 'Exento',
      tipo: d.isRecurrent ? `Recurrente (${d.frecuencia})` : 'Puntual'
    }));

    const contextoEmpresarial = `Sector: ${perfilEmpresa.sector || 'General'}. Objetivo Principal: ${perfilEmpresa.objetivo || 'Estabilidad financiera'}.`;

    fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: datosLimpios, empresaId, contextoSector: contextoEmpresarial }), 
    })
      .then(r => r.json())
      .then(r => setAiAnalysis(r.analysis || "Error al estructurar el reporte."))
      .catch(() => setAiAnalysis("Error en el servidor de inteligencia artificial."))
      .finally(() => setIsAnalyzing(false));
  };

  const enviarMensajeChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const nuevoMensaje = { role: 'user', content: currentMessage };
    const historial = [...chatMessages, nuevoMensaje];
    
    setChatMessages(historial);
    setCurrentMessage("");
    setIsChatLoading(true);

    const datosContexto = datosVisibles.map(d => ({ fecha: d.name, categoria: d.categoria, importe: d.total }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historial,
          contextoFinanciero: datosContexto,
          empresaId: empresaId,
          perfil: perfilEmpresa
        })
      });

      if (res.ok) {
        const resData = await res.json();
        setChatMessages([...historial, { role: 'ai', content: resData.reply }]);
      } else {
        setChatMessages([...historial, { role: 'ai', content: "⚠️ No pude conectar con el servidor." }]);
      }
    } catch (error) {
      setChatMessages([...historial, { role: 'ai', content: "⚠️ Error de red." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const exportarAExcel = () => {
    if (datosVisibles.length === 0) return alert("No hay datos para exportar.");
    let csvContent = "Fecha,Categoría,Recurrencia,Tipo,Base Imponible (EUR),IVA (%)\n";
    datosVisibles.forEach(row => {
      const tipoTxt = row.total >= 0 ? "Ingreso" : "Gasto";
      const recTxt = row.isRecurrent ? row.frecuencia : "Puntual";
      csvContent += `${row.name},${row.categoria || "General"},${recTxt},${tipoTxt},${row.total},${row.iva || 0}%\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Balance_TaxGuardAI_${filtro}.csv`;
    link.click();
  };

  return (
    <>
      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
         
          {/* 🚀 CABECERA DE MÓVIL CORRECTA */}
          <div className="lg:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800 fixed top-0 w-full z-30">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">T</div>
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
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">T</div>
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
                      onChange={(e) => {
                        setEmpresaId(e.target.value);
                        localStorage.setItem('taxguard_empresaActiva', e.target.value);
                      }} 
                      className="w-full bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none"
                    >
                        {empresas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button onClick={() => {setShowConfig(true); setIsSidebarOpen(false);}} className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition border border-slate-700" title="Configurar Perfil y Categorías">
                      ⚙️
                    </button>
                    <button onClick={() => eliminarEmpresa(empresaId)} className="p-2.5 bg-rose-900/30 text-rose-500 rounded-xl hover:bg-rose-900 transition" title="Eliminar Espacio">
                      ×
                    </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={nuevaEmpresa} onChange={(e) => setNuevaEmpresa(e.target.value)} placeholder="Nueva empresa..." className="w-full bg-slate-800 p-2 text-xs text-white rounded-lg border border-slate-700 outline-none" />
                  <button onClick={agregarEmpresa} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-500 transition">+</button>
                </div>
              </div>
             
              <nav className="space-y-1">
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800 text-white font-medium transition shadow-sm" href="/" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V16zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V16z"/></svg>
                  Consola General
                </Link>
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/analisis" onClick={() => setIsSidebarOpen(false)}>
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
              <button onClick={() => alert("El Portal de Pagos de Stripe se conectará aquí próximamente.")} className="w-full flex items-center justify-between bg-blue-900/20 p-3 rounded-2xl border border-blue-900/50 mb-3 hover:bg-blue-900/40 transition cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold text-blue-400">Plan Pro Activo</span>
                </div>
                <span className="text-[10px] font-bold text-blue-300 bg-blue-900/50 px-2 py-1 rounded-md">Gestionar</span>
              </button>
              
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Perfil y Sesión</span>
                <UserButton/>
              </div>
            </div>
          </aside>

          {isSidebarOpen && (
             <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
          )}

          <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
           
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 border-b border-slate-200 pb-6 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Panel Ejecutivo - <span className="text-blue-600">{empresaId || "Sin Seleccionar"}</span></h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Supervisión integrada de flujos de caja corporativos.</p>
              </div>
              
              <div className="flex items-center gap-4 self-start lg:self-auto">
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 transition hover:shadow-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {alertasDinamicas.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
                  </button>

                  {/* 🚀 CAJA DE NOTIFICACIONES SEGURA PARA MÓVILES */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-[85vw] max-w-[320px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden transform transition-all origin-top-right">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-900">Centro de Riesgos</h4>
                        <span className="bg-slate-800 text-white text-[10px] font-black px-2.5 py-1 rounded-full">{alertasDinamicas.length}</span>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto p-3 bg-white">
                        {alertasDinamicas.length === 0 ? (
                           <div className="py-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-2">
                             <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             Salud financiera estable. No hay alertas.
                           </div>
                        ) : (
                           alertasDinamicas.map((alerta, idx) => (
                             <div key={idx} className={`p-4 mb-3 rounded-xl border ${alerta.tipo === 'critico' ? 'bg-rose-50/50 border-rose-200' : alerta.tipo === 'advertencia' ? 'bg-amber-50/50 border-amber-200' : alerta.tipo === 'exito' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-blue-50/50 border-blue-200'} shadow-sm`}>
                               <h5 className={`text-xs font-black mb-1.5 uppercase tracking-wide ${alerta.tipo === 'critico' ? 'text-rose-700' : alerta.tipo === 'advertencia' ? 'text-amber-700' : alerta.tipo === 'exito' ? 'text-emerald-700' : 'text-blue-700'}`}>{alerta.titulo}</h5>
                               <p className={`text-[11px] font-medium leading-relaxed ${alerta.tipo === 'critico' ? 'text-rose-600' : alerta.tipo === 'advertencia' ? 'text-amber-700' : alerta.tipo === 'exito' ? 'text-emerald-600' : 'text-blue-600'}`}>{alerta.texto}</p>
                             </div>
                           ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="hidden sm:inline">Servidores Cloud Conectados</span>
                  <span className="sm:hidden">Online</span>
                </div>
              </div>
            </header>

            <div className="flex gap-2 md:gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              <button onClick={() => setFiltro('all')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Histórico</button>
              <button onClick={() => setFiltro('month')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'month' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Mes</button>
              <button onClick={() => setFiltro('quarter')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'quarter' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Trimestre</button>
              <button onClick={() => setFiltro('year')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'year' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Año</button>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl mb-8 text-white flex flex-col lg:flex-row justify-between lg:items-center relative overflow-hidden gap-6">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
               <div className="relative z-10 w-full lg:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                     <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Escudo Fiscal Integrado</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Liquidación estimada de IVA para el periodo actual.</p>
               </div>
               
               <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 relative z-10 w-full lg:w-auto justify-between lg:justify-end">
                  <div className="text-left lg:text-right w-[45%] lg:w-auto">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IVA Cobrado</p>
                     <p className="text-base md:text-lg font-black text-emerald-400">+{ivaRepercutido.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</p>
                  </div>
                  <div className="text-left lg:text-right w-[45%] lg:w-auto">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IVA Pagado</p>
                     <p className="text-base md:text-lg font-black text-rose-400">-{ivaSoportado.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</p>
                  </div>
                  <div className="text-left lg:text-right w-full lg:w-auto lg:pl-6 lg:border-l lg:border-slate-700 pt-4 lg:pt-0 border-t border-slate-700 lg:border-t-0">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Liquidación</p>
                     <p className={`text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 ${liquidacionIva > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                        <span>{liquidacionIva > 0 ? 'Pagar:' : 'A favor:'}</span>
                        <span>{Math.abs(liquidacionIva).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                     </p>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
              <div className="flex flex-col md:flex-row justify-between md:items-end mb-4 gap-4">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Objetivo de Ingresos ({etiquetasFiltro[filtro]})</h3>
                </div>
                <div className="text-left md:text-right">
                  {editandoMeta ? (
                    <div className="flex gap-2">
                      <input type="number" value={inputMeta} onChange={(e) => setInputMeta(e.target.value)} className="w-24 p-2 bg-slate-50 border border-slate-300 text-slate-900 font-bold rounded-lg text-sm outline-none" />
                      <button onClick={guardarNuevaMeta} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition">Guardar</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start md:items-end cursor-pointer group" onClick={() => setEditandoMeta(true)}>
                      <span className="text-2xl font-black text-slate-900">{ingresosTotales.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} € <span className="text-sm font-medium text-slate-400">/ {metaMensual.toLocaleString('es-ES')} €</span></span>
                      <span className="text-[10px] font-bold text-blue-500 uppercase group-hover:underline mt-1">Editar Meta</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className={`h-3 rounded-full transition-all duration-1000 ${porcentajeMeta >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${porcentajeMeta}%` }}></div>
              </div>
              <p className="text-right text-xs font-bold text-slate-500 mt-2">{porcentajeMeta}% Alcanzado</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base (Ingresos)</span>
                <span className="text-2xl md:text-3xl font-black text-emerald-500 tracking-tight mt-3">+ {ingresosTotales.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base (Gastos)</span>
                <span className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight mt-3">- {gastosTotales.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${beneficioNeto >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Beneficio Neto (Antes Impuestos)</span>
                <span className={`text-3xl font-black tracking-tight mt-3 ml-2 ${beneficioNeto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{beneficioNeto.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                    <h3 className="text-md font-bold text-slate-900">Añadir Transacción</h3>
                    
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={escanearFactura} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="w-full sm:w-auto justify-center text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1 shadow-sm disabled:opacity-50">
                      {isScanning ? "⏳ Escaneando..." : "📸 Escanear Factura"}
                    </button>
                  </div>

                  <form onSubmit={guardarDato} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button type="button" onClick={() => setTipoTransaccion('ingreso')} className={`py-2 rounded-xl text-xs font-bold transition border ${tipoTransaccion === 'ingreso' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>+ Ingreso</button>
                      <button type="button" onClick={() => setTipoTransaccion('gasto')} className={`py-2 rounded-xl text-xs font-bold transition border ${tipoTransaccion === 'gasto' ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>- Gasto</button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Operativa</label>
                        {/* 🚀 CORRECCIÓN: Input sin etiqueta 'required' para evitar bloqueos ciegos en móvil */}
                        <input type="date" value={mes} onChange={(e) => setMes(e.target.value)} className="w-full p-3 bg-white border border-slate-300 text-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de IVA</label>
                        <select value={ivaSeleccionado} onChange={(e) => setIvaSeleccionado(e.target.value)} className="w-full p-3 bg-white border border-slate-300 text-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="21">21% (General)</option>
                            <option value="10">10% (Reducido)</option>
                            <option value="4">4% (Superreducido)</option>
                            <option value="0">0% (Exento)</option>
                        </select>
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoría</label>
                      <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-3 bg-white border border-slate-300 text-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                        {(tipoTransaccion === 'ingreso' ? categoriasIngreso : categoriasGasto).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Imponible (€) (Sin IVA)</label>
                      {/* 🚀 CORRECCIÓN: Input seguro para móvil */}
                      <input type="text" inputMode="decimal" placeholder="Ej: 500.50" value={ingreso} onChange={(e) => setIngreso(e.target.value)} className="w-full p-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-3 border border-slate-200 rounded-xl mt-2 gap-3">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={isRecurrent} onChange={(e) => setIsRecurrent(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                        Hacer recurrente
                      </label>
                      {isRecurrent && (
                        <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className="w-full sm:w-auto p-1.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-bold outline-none">
                          <option value="Mensual">Mensual</option>
                          <option value="Trimestral">Trimestral</option>
                          <option value="Anual">Anual</option>
                        </select>
                      )}
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-2">{isSaving ? "Procesando..." : "Asignar Movimiento"}</button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[350px]">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-1">Balance Visual del Periodo</h3>
                </div>
                <div className="flex-1 min-h-[220px]">
                  {isMounted && datosGrafico.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={40} />
                        <Tooltip cursor={{fill: '#f8fafc'}} isAnimationActive={false} />
                        <Bar dataKey="total" radius={[6, 6, 6, 6]} maxBarSize={45} isAnimationActive={false}>
                          {datosGrafico.map((entry: any, index: number) => (
                            <Cell key={`bar-${index}`} fill={entry.total >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">Sin datos para graficar en este periodo</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <h3 className="text-md font-bold text-slate-900 mb-1">Libro Mayor Integrado</h3>
                <button onClick={exportarAExcel} className="flex items-center gap-2 text-xs font-bold bg-slate-50 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 shadow-sm">CSV</button>
              </div>
              
              <div className="max-h-[400px] overflow-x-auto overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-20">
                    <tr>
                      <th className="px-4 md:px-6 py-3">Fecha</th>
                      <th className="px-4 md:px-6 py-3">Categoría</th>
                      <th className="px-4 md:px-6 py-3">Base Imponible</th>
                      <th className="px-4 md:px-6 py-3">Impuestos</th>
                      <th className="px-4 md:px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {datosTabla.map((item: any, index: number) => {
                      if (editingId === item.id) {
                        return (
                          <tr key={`edit-${item.id}`} className="bg-blue-50/30 transition">
                            <td className="px-4 py-2">
                               <input type="date" value={editFormData.mes} onChange={(e) => setEditFormData({...editFormData, mes: e.target.value})} className="w-full p-1.5 border border-blue-300 rounded text-xs outline-none" />
                            </td>
                            <td className="px-4 py-2">
                               <select value={editFormData.categoria} onChange={(e) => setEditFormData({...editFormData, categoria: e.target.value})} className="w-full p-1.5 border border-blue-300 rounded text-xs outline-none">
                                 {(editFormData.tipo === 'ingreso' ? categoriasIngreso : categoriasGasto).map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                            </td>
                            <td className="px-4 py-2">
                               <input type="number" step="any" value={editFormData.ingreso} onChange={(e) => setEditFormData({...editFormData, ingreso: e.target.value})} className="w-full w-24 p-1.5 border border-blue-300 rounded text-xs outline-none" />
                            </td>
                            <td className="px-4 py-2">
                               <select value={editFormData.ivaSeleccionado} onChange={(e) => setEditFormData({...editFormData, ivaSeleccionado: e.target.value})} className="w-full p-1.5 border border-blue-300 rounded text-xs outline-none">
                                  <option value="21">21%</option>
                                  <option value="10">10%</option>
                                  <option value="4">4%</option>
                                  <option value="0">0%</option>
                               </select>
                            </td>
                            <td className="px-4 py-2 text-right space-x-2">
                               <button onClick={() => guardarEdicion(item.id)} className="text-emerald-600 font-bold text-xs hover:underline">Guardar</button>
                               <button onClick={() => setEditingId(null)} className="text-slate-500 font-bold text-xs hover:underline">Cancelar</button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={`view-${item.id || index}`} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 md:px-6 py-3.5 text-slate-600">{item.name}</td>
                          <td className="px-4 md:px-6 py-3.5 flex items-center">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">{item.categoria || 'General'}</span>
                            {item.isRecurrent && (
                              <span className="ml-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1" title={`Gasto fijo: ${item.frecuencia}`}>
                                🔄 <span className="hidden sm:inline">{item.frecuencia}</span>
                              </span>
                            )}
                          </td>
                          <td className={`px-4 md:px-6 py-3.5 font-bold ${item.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{item.total >= 0 ? '+' : '-'} {Math.abs(item.total).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                          <td className="px-4 md:px-6 py-3.5">
                             <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                {item.iva === 0 ? "Exento" : `IVA ${item.iva}%`}
                             </span>
                          </td>
                          <td className="px-4 md:px-6 py-3.5 text-right space-x-2">
                            <button onClick={() => iniciarEdicion(item)} className="text-blue-400 hover:text-blue-600 p-1 rounded-lg" title="Editar">
                              <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => item.id && eliminarDato(item.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-lg" title="Eliminar">
                              <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="h-24 md:h-10"></div>
          </main>
        </div>
      </Show>
    </>
  );
}