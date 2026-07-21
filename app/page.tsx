"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef } from "react";
import { useUser, UserButton, SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';
import Link from 'next/link';

// LAS TUBERÍAS DE SUPABASE Y GEMINI
import { obtenerDatosSupabase, guardarDatoSupabase, editarDatoSupabase, borrarDatoSupabase, escanearFacturaIA } from './actions';

export default function Home() {
  const router = useRouter(); 
  const { isSignedIn, isLoaded } = useUser(); 
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("Pulse 'Generar Reporte' para iniciar la evaluación inteligente de este periodo.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresaId, setEmpresaId] = useState(""); 
  const [nuevaEmpresa, setNuevaEmpresa] = useState("");
  const [papelera, setPapelera] = useState<{nombre: string, fecha: number}[]>([]);

  const [planActivo, setPlanActivo] = useState('loading');

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

  // 🚀 NUEVA VARIABLE: ESCUDO PARA VEHÍCULOS
  const [isVehiculo, setIsVehiculo] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [filtro, setFiltro] = useState("all");

  const [chartFilter, setChartFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  const fileInputCsvRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const syncSettingsToCloud = async (ajustes: any) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ajustes)
      });
    } catch (error) {
      console.error("Error sincronizando ajustes en la nube", error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => { 
    setIsMounted(true); 
    
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

         const listaEmpresas = ajustesGuardados.empresas || ["Alperez", "PetClean", "Techmovile"];
         setEmpresas(listaEmpresas);
         const activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "";
         setEmpresaId(activa);

         if (ajustesGuardados.papelera) setPapelera(ajustesGuardados.papelera);
      });
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    setChartFilter(null);
    setCurrentPage(1);
    setSearchTerm("");
  }, [filtro, empresaId]);

  useEffect(() => {
    setCategoria(tipoTransaccion === 'ingreso' ? categoriasIngreso[0] : categoriasGasto[0]);
    // Resetear el checkbox de vehículo si cambiamos a ingreso
    if (tipoTransaccion === 'ingreso') setIsVehiculo(false);
  }, [tipoTransaccion, categoriasIngreso, categoriasGasto]);

  const agregarEmpresa = async () => {
    if (nuevaEmpresa && !empresas.includes(nuevaEmpresa)) {
      const lista = [...empresas, nuevaEmpresa];
      setEmpresas(lista);
      setEmpresaId(nuevaEmpresa);
      setNuevaEmpresa("");
      
      const res = await fetch('/api/settings');
      const actuales: any = await res.json();
      await syncSettingsToCloud({ ...actuales, empresas: lista, empresaActiva: nuevaEmpresa });
    }
  };

  const eliminarEmpresa = async (nombre: string) => {
    const confirmacion = window.confirm(`⚠️ ATENCIÓN: ¿Estás seguro de que deseas borrar el espacio de trabajo "${nombre}"?\n\nLos datos se guardarán en la papelera de reciclaje durante 7 días antes de su eliminación definitiva.`);
    if (!confirmacion) return;

    const nuevaPapelera = [...papelera, { nombre, fecha: Date.now() }];
    setPapelera(nuevaPapelera);

    const lista = empresas.filter(e => e !== nombre);
    setEmpresas(lista);
    
    const nuevaActiva = empresaId === nombre ? (lista[0] || "") : empresaId;
    setEmpresaId(nuevaActiva);

    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    await syncSettingsToCloud({ ...actuales, empresas: lista, empresaActiva: nuevaActiva, papelera: nuevaPapelera });
  };

  const recuperarDePapelera = async (nombre: string) => {
    const lista = [...empresas, nombre];
    setEmpresas(lista);

    const nuevaPapelera = papelera.filter(item => item.nombre !== nombre);
    setPapelera(nuevaPapelera);
    setEmpresaId(nombre);

    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    await syncSettingsToCloud({ ...actuales, empresas: lista, empresaActiva: nombre, papelera: nuevaPapelera });
    alert(`✅ El espacio "${nombre}" ha sido restaurado con éxito.`);
  };

  useEffect(() => {
    if (!empresaId || planActivo === 'loading' || planActivo === 'free') return; 

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((ajustesGuardados: any) => {
         if (ajustesGuardados.metas && ajustesGuardados.metas[empresaId]) {
           setMetaMensual(ajustesGuardados.metas[empresaId]);
           setInputMeta(ajustesGuardados.metas[empresaId].toString());
         } else {
           setMetaMensual(5000);
           setInputMeta("5000");
         }

         if (ajustesGuardados.perfiles && ajustesGuardados.perfiles[empresaId]) {
           setPerfilEmpresa(ajustesGuardados.perfiles[empresaId]);
           setSectorInput(ajustesGuardados.perfiles[empresaId].sector);
           setObjetivoInput(ajustesGuardados.perfiles[empresaId].objetivo);
         } else {
           setPerfilEmpresa({ sector: "", objetivo: "" });
           setSectorInput("");
           setObjetivoInput("");
         }

         if (ajustesGuardados.categorias && ajustesGuardados.categorias[empresaId]) {
           setCategoriasIngreso(ajustesGuardados.categorias[empresaId].ingreso);
           setCategoriasGasto(ajustesGuardados.categorias[empresaId].gasto);
           setCatsIngresoInput(ajustesGuardados.categorias[empresaId].ingreso.join(", "));
           setCatsGastoInput(ajustesGuardados.categorias[empresaId].gasto.join(", "));
         } else {
           setCategoriasIngreso(defaultIngresos);
           setCategoriasGasto(defaultGastos);
           setCatsIngresoInput(defaultIngresos.join(", "));
           setCatsGastoInput(defaultGastos.join(", "));
         }
      });

    setChatMessages([]);
  }, [empresaId, planActivo]);

  const guardarNuevaMeta = async () => {
    const nuevaMetaNum = Number(inputMeta);
    if (nuevaMetaNum > 0) {
      setMetaMensual(nuevaMetaNum);
      const res = await fetch('/api/settings');
      const actuales: any = await res.json();
      const metasObj = actuales.metas || {};
      metasObj[empresaId] = nuevaMetaNum;
      await syncSettingsToCloud({ ...actuales, metas: metasObj });
    }
    setEditandoMeta(false);
  };

  const guardarPerfil = async () => {
    const nuevoPerfil = { sector: sectorInput, objetivo: objetivoInput };
    setPerfilEmpresa(nuevoPerfil);
    
    const nuevasIngreso = catsIngresoInput.split(',').map(c => c.trim()).filter(c => c);
    const nuevasGasto = catsGastoInput.split(',').map(c => c.trim()).filter(c => c);
    
    const catA_Guardar = {
       ingreso: nuevasIngreso.length > 0 ? nuevasIngreso : defaultIngresos,
       gasto: nuevasGasto.length > 0 ? nuevasGasto : defaultGastos
    };
    
    setCategoriasIngreso(catA_Guardar.ingreso);
    setCategoriasGasto(catA_Guardar.gasto);

    const res = await fetch('/api/settings');
    const actuales: any = await res.json();
    const perfilesObj = actuales.perfiles || {};
    perfilesObj[empresaId] = nuevoPerfil;
    const categoriasObj = actuales.categorias || {};
    categoriasObj[empresaId] = catA_Guardar;
    
    await syncSettingsToCloud({ ...actuales, perfiles: perfilesObj, categorias: categoriasObj });
    setShowConfig(false);
  };

  const determinarRangoDias = (tipoFiltro: string) => {
    if (tipoFiltro === 'month') return 30;
    if (tipoFiltro === 'quarter') return 90;
    if (tipoFiltro === 'year') return 365;
    return Infinity;
  };

  const datosVisibles = data.filter(item => {
    if (filtro === "all") return true;
    const ahora = new Date().getTime();
    const [d, m, y] = item.name.split('/');
    const fechaItem = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);
    return diffDias <= determinarRangoDias(filtro);
  });

  const datosCronologicos = [...datosVisibles].sort((a, b) => {
    const pA = a.name.split('/');
    const pB = b.name.split('/');
    return new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime() - new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime();
  });

  const chartData = datosCronologicos.reduce((acc: any[], curr: any) => {
    const [d, m, y] = curr.name.split('/');
    let clave = curr.name; 
    
    if (filtro === 'year' || filtro === 'all') {
      const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      clave = `${nombresMeses[Number(m) - 1]} ${y}`; 
    }

    const existente = acc.find((item: any) => item.name === clave);
    const valorNum = Number(curr.total); 
    
    if (existente) {
      if (valorNum > 0) existente.Ingresos += valorNum;
      else existente.Gastos += Math.abs(valorNum);
    } else {
      acc.push({ 
        name: clave, 
        rawDate: curr.name,
        Ingresos: valorNum > 0 ? valorNum : 0, 
        Gastos: valorNum < 0 ? Math.abs(valorNum) : 0 
      });
    }
    return acc;
  }, []);

  const datosTabla = [...datosVisibles].sort((a, b) => {
    const pA = a.name.split('/');
    const pB = b.name.split('/');
    return new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime() - new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime();
  });

  let datosTablaFiltrados = datosTabla.filter(item => {
    if (chartFilter) {
      const [d, m, y] = item.name.split('/');
      if (filtro === 'year' || filtro === 'all') {
         const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
         const mesGrafica = `${nombresMeses[Number(m) - 1]} ${y}`;
         if (mesGrafica !== chartFilter) return false;
      } else {
         if (item.name !== chartFilter) return false;
      }
    }
    if (searchTerm) {
       const searchLower = searchTerm.toLowerCase();
       const coincideCategoria = item.categoria?.toLowerCase().includes(searchLower);
       const coincideMonto = Math.abs(item.total).toString().includes(searchLower);
       if (!coincideCategoria && !coincideMonto) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(datosTablaFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = datosTablaFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const gastosPorCategoria = datosVisibles
    .filter(d => Number(d.total) < 0)
    .reduce((acc: {name: string, value: number}[], curr: any) => {
      const cat = curr.categoria || 'General';
      const existente = acc.find((item: any) => item.name === cat);
      if (existente) existente.value += Math.abs(Number(curr.total));
      else acc.push({ name: cat, value: Math.abs(Number(curr.total)) });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const ingresosTotales = datosVisibles.filter(d => Number(d.total) > 0).reduce((sum, item) => sum + Number(item.total), 0);
  const gastosTotales = datosVisibles.filter(d => Number(d.total) < 0).reduce((sum, item) => sum + Math.abs(Number(item.total)), 0);
  const beneficioNeto = ingresosTotales - gastosTotales;
  const porcentajeMeta = Math.min(Math.round((ingresosTotales / metaMensual) * 100), 100);

  const ivaRepercutido = datosVisibles.filter(d => Number(d.total) > 0).reduce((sum, item) => sum + (Number(item.total) * ((Number(item.iva) || 0) / 100)), 0);
  const ivaSoportado = datosVisibles.filter(d => Number(d.total) < 0).reduce((sum, item) => sum + (Math.abs(Number(item.total)) * ((Number(item.iva) || 0) / 100)), 0);
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
    if (!empresaId || planActivo === 'loading' || planActivo === 'free') return; 

    setData([]);
    setAiAnalysis("Pulse 'Generar Reporte' para iniciar la evaluación inteligente de este periodo.");
    
    obtenerDatosSupabase(empresaId).then(d => {
      if (d && d.length > 0) setData(d);
      else setData([]);
    });
  }, [empresaId, planActivo]);

  const escanearFactura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    
    const formData = new FormData();
    formData.append('factura', file);
    formData.append('categorias', categoriasGasto.join(', '));
    
    try {
      const res = await escanearFacturaIA(formData);

      if (res.success && res.data) {
        setTipoTransaccion('gasto'); 
        if (res.data.fecha) setMes(res.data.fecha);
        if (res.data.base_imponible) setIngreso(res.data.base_imponible.toString());
        if (res.data.iva !== undefined) setIvaSeleccionado(res.data.iva.toString());
        if (res.data.categoria && categoriasGasto.includes(res.data.categoria)) setCategoria(res.data.categoria);
      } else {
        alert("Error de la IA: " + (res.error || "Fallo desconocido"));
      }
    } catch (err) {
      alert("Error de conexión al escanear.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const manejarImportarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvText: text, empresaId })
        });

        const dataRes = await res.json();

        if (res.ok && dataRes.success) {
          alert(`✅ ¡Éxito! Se han importado y clasificado automáticamente ${dataRes.count} movimientos bancarios.`);
          const actualizadosBD = await obtenerDatosSupabase(empresaId);
          setData(actualizadosBD);
        } else {
          alert("Error del servidor al importar: " + (dataRes.error || "Fallo desconocido"));
        }
      } catch (err) {
        alert("Error de conexión al procesar el archivo bancario.");
      } finally {
        setIsImporting(false);
        if (fileInputCsvRef.current) fileInputCsvRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  const guardarDato = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
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
      
      const textoLimpio = ingreso.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      const numeroLimpio = parseFloat(textoLimpio);

      if (isNaN(numeroLimpio)) {
         setIsSaving(false);
         alert("⚠️ El importe introducido no es válido. Usa solo números y comas/puntos.");
         return;
      }

      // 🚀 MAGIA DEL VEHÍCULO: Si es gasto y está marcado, dividimos el IVA introducido entre 2
      let ivaFinal = ivaSeleccionado;
      if (tipoTransaccion === 'gasto' && isVehiculo) {
         ivaFinal = (Number(ivaSeleccionado) / 2).toString();
      }

      const valorFinal = tipoTransaccion === 'gasto' ? -Math.abs(numeroLimpio) : Math.abs(numeroLimpio);
      // Añadimos una marca al detalle si se aplicó el escudo del 50%
      const detalleAdicional = (tipoTransaccion === 'gasto' && isVehiculo) ? " (Gasto Vehículo: IVA 50% deducible)" : "";
      
      const res = await guardarDatoSupabase({ 
        month: fecha, 
        total: valorFinal, 
        categoria: categoria, 
        iva: ivaFinal,
        empresaId: empresaId,
        isRecurrent: isRecurrent,
        frecuencia: isRecurrent ? frecuencia : null,
        concepto_detalle: detalleAdicional
      });

      if (res.success) {
        const actualizadosBD = await obtenerDatosSupabase(empresaId);
        setData(actualizadosBD);
        setIngreso('');
        setIsRecurrent(false);
        setIsVehiculo(false); // Reiniciamos el escudo
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

  const eliminarDato = async (id: any) => {
    const confirmacion = window.confirm("¿Seguro que deseas eliminar esta transacción?");
    if (!confirmacion) return;

    const res = await borrarDatoSupabase(id.toString());
    if (res.success) {
      const restantes = data.filter(item => item.id !== id);
      setData(restantes);
    }
  };

  const iniciarEdicion = (item: any) => {
    setEditingId(item.id);
    const [d, m, y] = item.name.split('/');
    setEditFormData({
      tipo: Number(item.total) >= 0 ? 'ingreso' : 'gasto',
      mes: `${y}-${m}-${d}`,
      ingreso: Math.abs(Number(item.total)).toString(),
      categoria: item.categoria || 'General',
      ivaSeleccionado: item.iva?.toString() || '0'
    });
  };

  const guardarEdicion = async (id: any) => {
    try {
      const [y, m, d] = editFormData.mes.split('-');
      const fecha = `${d}/${m}/${y}`;
      const numeroLimpio = parseFloat(editFormData.ingreso.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      
      if (isNaN(numeroLimpio)) return alert("⚠️ El importe introducido no es válido.");

      const valorFinal = editFormData.tipo === 'gasto' ? -Math.abs(numeroLimpio) : Math.abs(numeroLimpio);

      const res = await editarDatoSupabase({ 
        id: id, 
        month: fecha, 
        total: valorFinal, 
        categoria: editFormData.categoria, 
        iva: editFormData.ivaSeleccionado 
      });

      if (res.success) {
        const actualizadosBD = await obtenerDatosSupabase(empresaId);
        setData(actualizadosBD);
        setEditingId(null);
      }
    } catch (error) {
      alert("⚠️ Error al actualizar el dato");
    }
  };

  const enviarMensajeChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const nuevoMensaje = { role: 'user', content: currentMessage };
    const historial = [...chatMessages, nuevoMensaje];
    
    setChatMessages(historial);
    setCurrentMessage("");
    setIsChatLoading(true);

    const datosContexto = datosVisibles.map(d => ({ 
      fecha: d.name, 
      categoria: d.categoria, 
      importe: d.total, 
      cliente: d.cliente_nombre || d.cliente || 'Desconocido', 
      concepto: d.concepto_detalle || d.concepto || 'General', 
      factura: d.numero_factura || d.factura || 'Manual' 
    }));

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
    
    // BOM para que Excel reconozca tildes en UTF-8 y separación por punto y coma (;)
    let csvContent = "\uFEFFFecha;Categoría;Recurrencia;Tipo;Base Imponible (EUR);IVA (%);Cuota IVA (EUR);Total (EUR)\n";
    
    datosVisibles.forEach(row => {
      const valorNum = Number(row.total);
      const tipoTxt = valorNum >= 0 ? "Ingreso" : "Gasto";
      const recTxt = row.isRecurrent ? row.frecuencia : "Puntual";
      const ivaPorcentaje = Number(row.iva) || 0;
      
      const cuotaIva = Math.abs(valorNum) * (ivaPorcentaje / 100);
      const totalFinal = Math.abs(valorNum) + cuotaIva;

      // Forzamos 2 decimales y usamos la coma como separador decimal para España
      const fNum = (num: number) => num.toFixed(2).replace('.', ',');

      csvContent += `${row.name};${row.categoria || "General"};${recTxt};${tipoTxt};${fNum(Math.abs(valorNum))};${ivaPorcentaje}%;${fNum(cuotaIva)};${fNum(totalFinal)}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Libro_Mayor_${empresaId || 'General'}_${filtro}.csv`;
    link.click();
  };

  if (!isMounted) return null;
  
  if (planActivo === 'loading' && isSignedIn) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Preparando entorno seguro...</h2>
           <p className="text-sm font-medium text-slate-500 mb-6">Comprobando credenciales y conexión cifrada</p>
           
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
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
          
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
                <div className="flex gap-2 mt-1">
                    <select 
                      value={empresaId} 
                      onChange={async (e) => {
                        const newId = e.target.value;
                        setEmpresaId(newId);
                        
                        const res = await fetch('/api/settings');
                        const actuales: any = await res.json(); 
                        await syncSettingsToCloud({ ...actuales, empresaActiva: newId });
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium transition shadow-sm shadow-blue-600/20" href="/" onClick={() => setIsSidebarOpen(false)}>
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

          {isSidebarOpen && (
             <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
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

                  {showNotifications && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-[85vw] sm:w-80 max-w-[320px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden transform transition-all origin-top-left sm:origin-top-right">
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

            <div className="flex gap-2 lg:gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              <button onClick={() => setFiltro('all')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Histórico</button>
              <button onClick={() => setFiltro('month')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'month' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Mes</button>
              <button onClick={() => setFiltro('quarter')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'quarter' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Trimestre</button>
              <button onClick={() => setFiltro('year')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'year' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Año</button>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl mb-8 text-white flex flex-col xl:flex-row justify-between xl:items-center relative overflow-hidden gap-6">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
               <div className="relative z-10 w-full xl:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                     <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Escudo Fiscal Integrado</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Liquidación estimada de IVA para el periodo actual.</p>
               </div>
               
               <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 relative z-10 w-full xl:w-auto justify-between xl:justify-end">
                  <div className="text-left xl:text-right w-[45%] lg:w-auto">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IVA Cobrado</p>
                     <p className="text-base md:text-lg font-black text-emerald-400">+{ivaRepercutido.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</p>
                  </div>
                  <div className="text-left xl:text-right w-[45%] lg:w-auto">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IVA Pagado</p>
                     <p className="text-base md:text-lg font-black text-rose-400">-{ivaSoportado.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</p>
                  </div>
                  <div className="text-left xl:text-right w-full lg:w-auto xl:pl-6 xl:border-l xl:border-slate-700 pt-4 xl:pt-0 border-t border-slate-700 xl:border-t-0">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Liquidación</p>
                     <p className={`text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 ${liquidacionIva > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                        <span>{liquidacionIva > 0 ? 'Pagar:' : 'A favor:'}</span>
                        <span>{Math.abs(liquidacionIva).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                     </p>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-4 gap-4">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Objetivo de Ingresos ({etiquetasFiltro[filtro]})</h3>
                </div>
                <div className="text-left lg:text-right">
                  {editandoMeta ? (
                    <div className="flex gap-2">
                      <input type="number" value={inputMeta} onChange={(e) => setInputMeta(e.target.value)} className="w-24 p-2 bg-slate-50 border border-slate-300 text-slate-900 font-bold rounded-lg text-sm outline-none" />
                      <button onClick={guardarNuevaMeta} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition">Guardar</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start lg:items-end cursor-pointer group" onClick={() => setEditandoMeta(true)}>
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  
                  <div className="flex flex-col gap-3 mb-6">
                    <h3 className="text-md font-bold text-slate-900">Añadir Transacción</h3>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={escanearFactura} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="justify-center text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1 shadow-sm disabled:opacity-50">
                        {isScanning ? "⏳ Leyendo..." : "📸 Factura OCR"}
                      </button>

                      <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputCsvRef} onChange={manejarImportarCSV} />
                      <button type="button" onClick={() => fileInputCsvRef.current?.click()} disabled={isImporting} className="justify-center text-[10px] font-bold bg-slate-50 text-slate-600 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1 shadow-sm disabled:opacity-50">
                        {isImporting ? "⏳ Cargando..." : "📊 Banco (CSV)"}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={guardarDato} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button type="button" onClick={() => setTipoTransaccion('ingreso')} className={`py-2 rounded-xl text-xs font-bold transition border ${tipoTransaccion === 'ingreso' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>+ Ingreso</button>
                      <button type="button" onClick={() => setTipoTransaccion('gasto')} className={`py-2 rounded-xl text-xs font-bold transition border ${tipoTransaccion === 'gasto' ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>- Gasto</button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Operativa</label>
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
                      <input type="text" inputMode="decimal" placeholder="Ej: 500.50" value={ingreso} onChange={(e) => setIngreso(e.target.value)} className="w-full p-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    
                    {/* 🚀 NUEVA CASILLA PARA VEHÍCULOS (SOLO APARECE SI ES GASTO) */}
                    {tipoTransaccion === 'gasto' && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                            <input 
                                type="checkbox" 
                                id="vehiculo" 
                                checked={isVehiculo} 
                                onChange={(e) => setIsVehiculo(e.target.checked)} 
                                className="w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500" 
                            />
                            <label htmlFor="vehiculo" className="text-xs font-bold text-orange-800 cursor-pointer select-none">
                                🚘 Gasto de Vehículo (Deducir solo 50% IVA)
                            </label>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-slate-50 p-3 border border-slate-200 rounded-xl mt-2 gap-3">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={isRecurrent} onChange={(e) => setIsRecurrent(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                        Hacer recurrente
                      </label>
                      {isRecurrent && (
                        <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className="w-full lg:w-auto p-1.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-bold outline-none">
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

              <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[350px]">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-md font-bold text-slate-900">Balance Visual del Periodo</h3>
                  {chartFilter && (
                     <button onClick={() => setChartFilter(null)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition border border-slate-200">
                        Mostrando: {chartFilter} (Quitar filtro ✖)
                     </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium mb-4">Haz clic en una barra para filtrar la tabla de abajo.</p>
                <div className="flex-1 min-h-[220px]">
                  {isMounted && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(state) => {
                         if (state && state.activeLabel) {
                            setChartFilter(state.activeLabel);
                            setCurrentPage(1); 
                         }
                      }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={40} />
                        
                        <Tooltip 
                           formatter={(value: any) => [`${Number(value).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €`, undefined]}
                           cursor={{fill: '#f1f5f9'}} 
                           isAnimationActive={false}
                           contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                           labelStyle={{ color: '#0f172a', fontWeight: '900', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9', marginBottom: '8px', fontSize: '14px' }}
                        />

                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }} />
                        <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} className="cursor-pointer hover:opacity-80 transition-opacity" />
                        <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} className="cursor-pointer hover:opacity-80 transition-opacity" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">Sin datos para graficar en este periodo</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between mb-8">
              <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center bg-white z-10 gap-4">
                <div className="flex items-center gap-3">
                   <h3 className="text-md font-bold text-slate-900">Libro Mayor Integrado</h3>
                   <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black px-2 py-0.5 rounded-full">{datosTablaFiltrados.length} registros</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                   <input 
                      type="text" 
                      placeholder="🔍 Buscar categoría o importe..." 
                      value={searchTerm}
                      onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                      className="flex-1 sm:w-64 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                   />
                   <button onClick={exportarAExcel} className="flex items-center gap-2 text-xs font-bold bg-slate-50 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 shadow-sm transition">CSV</button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
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
                    {currentItems.map((item: any, index: number) => {
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
                               <input type="text" inputMode="decimal" value={editFormData.ingreso} onChange={(e) => setEditFormData({...editFormData, ingreso: e.target.value})} className="w-full w-24 p-1.5 border border-blue-300 rounded text-xs outline-none" />
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
                                🔄 <span className="hidden lg:inline">{item.frecuencia}</span>
                              </span>
                            )}
                            {/* 🚀 INDICADOR VISUAL SI APLICÓ EL ESCUDO DEL VEHÍCULO */}
                            {item.concepto_detalle && item.concepto_detalle.includes("Vehículo") && (
                                <span className="ml-2 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1 border border-orange-200" title="Solo 50% del IVA deducido por ley">
                                   🚘 50%
                                </span>
                            )}
                          </td>
                          <td className={`px-4 md:px-6 py-3.5 font-bold ${Number(item.total) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{Number(item.total) >= 0 ? '+' : '-'} {Math.abs(Number(item.total)).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                          
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
                    {datosTablaFiltrados.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-400">No se encontraron registros para esta búsqueda o filtro.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* 🚀 PAGINACIÓN AVANZADA */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                   <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition"
                   >
                      Anterior
                   </button>
                   <span className="text-xs font-semibold text-slate-500">
                      Página <span className="font-black text-slate-700">{currentPage}</span> de {totalPages}
                   </span>
                   <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition"
                   >
                      Siguiente
                   </button>
                </div>
              )}
            </div>

            <div className="h-24 md:h-10"></div>
          </main>
        </div>

        <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 flex flex-col items-end" translate="no">
          {isChatOpen && (
            <div className="mb-4 w-[calc(100vw-3rem)] max-w-sm h-[400px] md:h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in-up">
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <h4 className="text-sm font-bold">CFO Virtual - {empresaId}</h4>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 mt-10">Hola. Soy tu asistente financiero. Puedes preguntarme sobre tus gastos, ingresos, o pedirme consejos sobre rentabilidad.</p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={`${i}-${msg.content.length}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 text-sm rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                        {msg.role === 'user' ? (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        ) : (
                          <div className="prose prose-sm prose-slate max-w-none" key={`md-${msg.content.length}`}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                   <div className="flex justify-start">
                     <div className="bg-white border border-slate-200 text-slate-400 p-3 rounded-2xl rounded-tl-none shadow-sm text-xs flex gap-1">
                       <span className="animate-bounce">●</span><span className="animate-bounce delay-100">●</span><span className="animate-bounce delay-200">●</span>
                     </div>
                   </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={enviarMensajeChat} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  value={currentMessage} 
                  onChange={(e) => setCurrentMessage(e.target.value)} 
                  placeholder="Pregunta a tu CFO..." 
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="submit" disabled={isChatLoading || !currentMessage.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                  <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V6m0 0l-4 4m4-4l4 4" /></svg>
                </button>
              </form>
            </div>
          )}

          <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </button>
        </div>

        {showConfig && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" translate="no">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-lg font-black text-slate-900">Ajustes: {empresaId}</h3>
                  <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-rose-500 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                  
                  {papelera.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-rose-800 mb-1 flex items-center gap-2">
                            🗑️ Papelera de Reciclaje
                        </h4>
                        <p className="text-xs text-rose-600 font-medium mb-3">Estos espacios fueron borrados recientemente. Puedes restaurarlos.</p>
                        <div className="space-y-2">
                           {papelera.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-rose-100">
                               <span className="text-xs font-bold text-slate-700">{item.nombre}</span>
                               <button onClick={() => recuperarDePapelera(item.nombre)} className="text-[10px] font-bold bg-rose-600 text-white px-3 py-1.5 rounded-md hover:bg-rose-700">Restaurar Espacio</button>
                             </div>
                           ))}
                        </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                      <h4 className="text-sm font-bold text-blue-800 mb-1">Perfil de Inteligencia Artificial</h4>
                      <p className="text-xs text-blue-600 font-medium mb-3">Estos datos enseñan a TaxGuard AI a entender tu modelo de negocio.</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Sector de la Empresa</label>
                          <input type="text" value={sectorInput} onChange={(e) => setSectorInput(e.target.value)} placeholder="Ej: Clínica Dental" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Objetivo Principal</label>
                          <input type="text" value={objetivoInput} onChange={(e) => setObjetivoInput(e.target.value)} placeholder="Ej: Reducir costes médicos" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <h4 className="text-sm font-bold text-slate-800 mb-1">Categorías Personalizadas</h4>
                      <p className="text-xs text-slate-500 font-medium mb-3">Escribe tus propias categorías separadas por comas. El Escáner OCR aprenderá a usarlas automáticamente.</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Categorías de Ingreso</label>
                          <input type="text" value={catsIngresoInput} onChange={(e) => setCatsIngresoInput(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Categorías de Gasto</label>
                          <input type="text" value={catsGastoInput} onChange={(e) => setCatsGastoInput(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-rose-700 outline-none focus:ring-2 focus:ring-rose-500/20" />
                        </div>
                      </div>
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                  <button onClick={guardarPerfil} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-md transition">
                    Guardar Configuración
                  </button>
                </div>
             </div>
          </div>
        )}
      </Show>

      {/* 🚀 LANDING PAGE PÚBLICA (CON LA NUEVA SECCIÓN DE PLANES Y RENTABILIDAD) */}
      <Show when="signed-out">
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30" translate="no">
          
          <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md fixed top-0 w-full z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-10 h-10 bg-white rounded-xl p-1 object-contain shadow-lg shadow-blue-500/20" />
                <span className="text-2xl font-black tracking-tight text-white">TaxGuard<span className="text-blue-500">AI</span></span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <SignInButton mode="modal">
                  <button className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white transition">
                    Iniciar Sesión
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition backdrop-blur-sm border border-white/5 shadow-sm">
                    Crear Cuenta
                  </button>
                </SignUpButton>
              </div>
            </div>
          </nav>

          <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-white/5">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                SaaS Financiero B2B
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8 max-w-4xl mx-auto">
                El primer Director Financiero con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Inteligencia Artificial</span>
              </h1>
              
              <p className="text-lg lg:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                Automatiza tu contabilidad, escanea facturas al instante y genera los modelos oficiales de Hacienda sin depender de terceros. El control total de tu rentabilidad, en tiempo real.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignUpButton mode="modal">
                  <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl shadow-blue-500/20 border border-blue-400/20">
                    Crear Cuenta Gratis
                  </button>
                </SignUpButton>

                <SignInButton mode="modal">
                  <button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl border border-slate-700">
                    Iniciar Sesión
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">La Inversión que se paga sola</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                No contrates un software. Contrata tiempo. TaxGuard AI está diseñado para ahorrarte más de <span className="text-blue-400 font-bold">30 horas al mes</span> en gestión administrativa y cientos de euros en errores fiscales.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* TARJETA AUTÓNOMO */}
              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 hover:border-slate-600 transition flex flex-col relative">
                <div className="mb-6">
                   <h3 className="text-2xl font-bold text-white mb-2">Plan Autónomo</h3>
                   <p className="text-slate-400 text-sm">El reemplazo perfecto a la gestoría tradicional de picar datos.</p>
                </div>
                <div className="mb-8 pb-8 border-b border-white/10">
                   <span className="text-5xl font-black text-white">49€</span><span className="text-slate-500 font-medium">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Escáner OCR Ilimitado con Inteligencia Artificial. Sube tickets y olvídate.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Cálculo Automático del Modelo 303 (IVA). Listo para copiar y pegar en Hacienda.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Generador de Facturas en PDF oficiales y personalizadas con tu logo.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Libro Mayor y Escudo Fiscal (Soporte ante auditorías).</span>
                   </li>
                </ul>
                <SignUpButton mode="modal">
                  <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl border border-slate-700 transition">
                    Empezar como Autónomo
                  </button>
                </SignUpButton>
              </div>

              {/* TARJETA EMPRESA PRO */}
              <div className="bg-slate-900 p-8 rounded-3xl border-2 border-blue-500 shadow-2xl shadow-blue-900/20 flex flex-col relative transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest shadow-lg">
                  MÁS RECOMENDADO
                </div>
                <div className="mb-6">
                   <h3 className="text-2xl font-bold text-white mb-2">Plan Empresa Pro</h3>
                   <p className="text-blue-300 text-sm font-medium">Un departamento financiero entero dentro de tu pantalla.</p>
                </div>
                <div className="mb-8 pb-8 border-b border-white/10">
                   <span className="text-5xl font-black text-blue-400">89€</span><span className="text-slate-500 font-medium">/mes</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-white text-sm font-bold">Todo lo incluido en el Plan Autónomo.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">CFO Virtual 24/7:</strong> Un asistente que responde dudas sobre rentabilidad y estrategias.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Auditorías Avanzadas:</strong> Reportes ejecutivos generados por IA identificando fugas de capital.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Gráficos P&L:</strong> Visualiza márgenes operativos y evolución mensual interactiva.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Soporte Técnico VIP Prioritario.</span>
                   </li>
                </ul>
                <SignUpButton mode="modal">
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl border border-blue-400/20 shadow-xl shadow-blue-500/20 transition">
                    Dominar mis finanzas por 89€
                  </button>
                </SignUpButton>
              </div>

            </div>
          </div>

          <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm relative z-10 bg-slate-950">
            <p>© {new Date().getFullYear()} TaxGuard AI. Todos los derechos reservados.</p>
            <p className="mt-2">Plataforma SaaS de alto rendimiento para PYMEs.</p>
            <p className="mt-6 text-xs text-slate-600">Contacto: soporte.taxguard@gmail.com</p>
          </footer>
        </div>
      </Show>
    </>
  );
}