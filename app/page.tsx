"use client";

import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef, useMemo } from "react";
import { useUser, UserButton, SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { obtenerDatosSupabase, guardarDatoSupabase, editarDatoSupabase, borrarDatoSupabase, escanearFacturaIA, actualizarEstadoPago, verificarRolUsuario, invitarAsesor, obtenerAsesores, revocarAsesor, obtenerEmpresasCliente, generarRecurrentesPendientes } from './actions';
import { transaccionSchema, mapearErroresZod, parsearImporte } from '../lib/validations';
import { obtenerAjustes, obtenerAjustesSilencioso, guardarAjustes } from '../lib/settingsClient';
import { celdaCSVSegura } from '../lib/csvExport';

// 🚀 RENDIMIENTO: @react-pdf/renderer se carga en su propio chunk, solo en el navegador y solo
// cuando este botón llega a pintarse, para no lastrar el JS inicial de la Consola General.
const LibroMayorPDFButton = dynamic(() => import('../components/pdf/LibroMayorPDFButton'), {
  ssr: false,
  loading: () => <button disabled className="flex-1 sm:flex-none flex justify-center items-center gap-2 text-xs font-bold bg-blue-50 text-blue-400 px-3 py-2 rounded-lg border border-blue-200 shadow-sm whitespace-nowrap opacity-50">⏳...</button>
});

// 🚀 SOLUCIÓN B2B: Extraemos las etiquetas fuera para que el PDF las vea
const etiquetasFiltro: Record<string, string> = {
  all: "Histórico Completo", week: "Última Semana", month: "Último Mes", quarter: "Último Trimestre", year: "Último Año"
};

// 🚀 RENDIMIENTO: funciones puras sin dependencias de estado, fuera del componente
// para que no se recreen en cada render.
const determinarRangoDias = (tipoFiltro: string) => {
  if (tipoFiltro === 'week') return 7;
  if (tipoFiltro === 'month') return 30;
  if (tipoFiltro === 'quarter') return 90;
  if (tipoFiltro === 'year') return 365;
  return Infinity;
};

const parseFechaTS = (item: any) => {
  const [d, m, y] = item.name.split('/');
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
};

export default function Home() {
  const router = useRouter(); 
  const { isSignedIn, isLoaded, user } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [data, setData] = useState<any[]>([]);
  // 🛡️ BLINDAJE DE ESTADO: guarda qué empresa se pidió por última vez, para poder ignorar
  // respuestas "tardías" si el usuario cambia de espacio de trabajo varias veces muy rápido
  // (evita mezclar datos financieros de dos empresas distintas en pantalla).
  const empresaSolicitadaRef = useRef<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: 'fecha' | 'categoria' | 'importe'; direction: 'asc' | 'desc' }>({ key: 'fecha', direction: 'desc' });
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [espaciosCliente, setEspaciosCliente] = useState<any[]>([]); 
  
  const [empresaId, setEmpresaId] = useState(""); 
  const [nuevaEmpresa, setNuevaEmpresa] = useState("");
  const [papelera, setPapelera] = useState<{nombre: string, fecha: number}[]>([]);

  const [planActivo, setPlanActivo] = useState('loading');
  
  const [rolUsuario, setRolUsuario] = useState("LOADING");
  const [showAsesorModal, setShowAsesorModal] = useState(false);
  const [asesorEmail, setAsesorEmail] = useState("");
  const [listaAsesores, setListaAsesores] = useState<any[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const [mes, setMes] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [tipoTransaccion, setTipoTransaccion] = useState<"ingreso" | "gasto" | "proyecto">("ingreso");
  
  const [cifEmisor, setCifEmisor] = useState("");
  const [numFactura, setNumFactura] = useState("");
  const [estadoPago, setEstadoPago] = useState("COBRADO");

  const [proyecto, setProyecto] = useState("");
  const [proyectoIngresos, setProyectoIngresos] = useState([{ id: Date.now(), concepto: "", importe: "", categoria: "Ventas", iva: "21" }]);
  const [proyectoGastos, setProyectoGastos] = useState([{ id: Date.now() + 1, concepto: "", importe: "", categoria: "Logística", iva: "21" }]);

  const defaultIngresos = ["Ventas", "Servicios", "Inversión", "Subvenciones", "Préstamos", "Otros"];
  const defaultGastos = ["Logística", "Marketing", "Software/Suscripciones", "Inventario/Materiales", "Nóminas", "Impuestos", "Dietas", "Mantenimiento", "Seguros", "Otros"];

  const [categoriasIngreso, setCategoriasIngreso] = useState(defaultIngresos);
  const [categoriasGasto, setCategoriasGasto] = useState(defaultGastos);
  const [categoria, setCategoria] = useState(categoriasIngreso[0]);
  
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [frecuencia, setFrecuencia] = useState("Mensual");
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");

  const [isVehiculo, setIsVehiculo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filtro, setFiltro] = useState("all");

  const [confianzaIA, setConfianzaIA] = useState<number | null>(null);
  const [evidenciaIA, setEvidenciaIA] = useState<string | null>(null);
  
  const [urlArchivoTemporal, setUrlArchivoTemporal] = useState<string | null>(null);
  const [nombreArchivoTemporal, setNombreArchivoTemporal] = useState<string | null>(null);
  const [tipoArchivoTemporal, setTipoArchivoTemporal] = useState<string | null>(null);
  
  const [filtroDoc, setFiltroDoc] = useState<"all" | "ingresos" | "gastos" | "presupuestos" | "abonos" | "proyectos" | "pendientes">("all");
  const [subFiltroProyecto, setSubFiltroProyecto] = useState<"all" | "ingresos" | "gastos">("all");
  const [proyectoSeleccionadoFiltro, setProyectoSeleccionadoFiltro] = useState<string>("todos");

  const [chartFilter, setChartFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [metaMensual, setMetaMensual] = useState(5000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState("5000");

  const [showNotifications, setShowNotifications] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [perfilEmpresa, setPerfilEmpresa] = useState({ sector: "", objetivo: "" });
  const [sectorInput, setSectorInput] = useState("");
  const [objetivoInput, setObjetivoInput] = useState("");

  const [datosFiscales, setDatosFiscales] = useState({ razonSocial: "", nif: "", direccion: "" });

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

  // 🛡️ BLINDAJE DE DATOS: errores de validación por campo + confirmaciones destructivas
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<any | null>(null);
  const [empresaAEliminar, setEmpresaAEliminar] = useState<string | null>(null);

  const proyIngresosNumTotal = proyectoIngresos.reduce((acc, i) => acc + (parseFloat(i.importe.replace(/,/g, '.').replace(/[^0-9.-]/g, '')) || 0), 0);
  const proyGastosNumTotal = proyectoGastos.reduce((acc, g) => acc + (parseFloat(g.importe.replace(/,/g, '.').replace(/[^0-9.-]/g, '')) || 0), 0);
  const proyMargen = proyIngresosNumTotal - proyGastosNumTotal;
  const proyMargenPorcentaje = proyIngresosNumTotal > 0 ? (proyMargen / proyIngresosNumTotal) * 100 : 0;

  const currentBase = parseFloat(ingreso.replace(/,/g, '.').replace(/[^0-9.-]/g, '')) || 0;
  const currentIva = Number(ivaSeleccionado) || 0;
  const currentIvaAmount = tipoTransaccion === 'gasto' && isVehiculo ? currentBase * ((currentIva/2)/100) : currentBase * (currentIva/100);
  const currentTotal = currentBase + currentIvaAmount;

  // 🛡️ Limpiador visual seguro
  let nombreEmpresaVisual = "Cargando...";
  if (empresaId) {
      if (empresaId.startsWith("CLIENTE|")) {
          nombreEmpresaVisual = empresaId.split('|')[2] || "Cliente";
      } else {
          nombreEmpresaVisual = empresaId === "undefined" || empresaId === "CLIENTE_undefined" ? "Mi Empresa Principal" : empresaId;
      }
  }

  const gestionarSuscripcion = async () => {
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; 
      } else {
        toast.info("Modo Administrador", { description: "Como estás usando una cuenta de Administrador, no has registrado tarjeta." });
      }
    } catch (error) {
      toast.error("Error", { description: "Error de conexión con la pasarela." });
    }
  };

  // 🛡️ BLINDAJE DE CONEXIÓN: ya no falla en silencio. Devuelve true/false para que
  // cada acción solo muestre "Guardado con éxito" si realmente se guardó.
  const syncSettingsToCloud = (ajustes: any) => guardarAjustes(ajustes);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => { 
    setIsMounted(true); 
    if (!isLoaded) return;
    if (!isSignedIn) return;

    obtenerEmpresasCliente().then(clientes => {
        setEspaciosCliente(clientes);
    });

    obtenerAjustesSilencioso()
      .then((ajustesGuardados: any) => {
         const planDetectado = ajustesGuardados.planSuscripcion || 'free';
         if (planDetectado === 'free') { router.push('/precios'); return; }

         setPlanActivo(planDetectado);

         const listaEmpresas = ajustesGuardados.empresas || ["Mi Empresa Principal"];
         setEmpresas(listaEmpresas);
         
         let activa = ajustesGuardados.empresaActiva || listaEmpresas[0] || "Mi Empresa Principal";
         if (activa === "undefined" || activa === "CLIENTE_undefined") activa = "Mi Empresa Principal";
         
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
    if (tipoTransaccion === 'ingreso' || tipoTransaccion === 'proyecto') {
        setCategoria(categoriasIngreso[0]);
        setEstadoPago("COBRADO");
    } else {
        setCategoria(categoriasGasto[0]);
        setEstadoPago("PAGADO");
    }
    if (tipoTransaccion === 'ingreso' || tipoTransaccion === 'proyecto') setIsVehiculo(false);
  }, [tipoTransaccion, categoriasIngreso, categoriasGasto]);

  const manejarCambioEmpresa = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valorSeleccionado = e.target.value;
    setEmpresaId(valorSeleccionado);
    
    if (!valorSeleccionado.startsWith("CLIENTE|")) {
        const actuales = await obtenerAjustes();
        if (!actuales) return; // 🛡️ Sin conexión: abortamos para no pisar los ajustes reales de la nube.
        await syncSettingsToCloud({ ...actuales, empresaActiva: valorSeleccionado });
    }
  };

  const salirModoAsesor = async () => {
    const miEmpresaPrincipal = empresas[0] || "Mi Empresa Principal";
    setEmpresaId(miEmpresaPrincipal);
    const actuales = await obtenerAjustes();
    if (!actuales) return;
    const guardadoOk = await syncSettingsToCloud({ ...actuales, empresaActiva: miEmpresaPrincipal });
    if (guardadoOk) toast.success("Modo Propietario Activo", { description: "Has vuelto a tu espacio personal." });
  };

  const agregarEmpresa = async () => {
    if (nuevaEmpresa && !empresas.includes(nuevaEmpresa)) {
      const lista = [...empresas, nuevaEmpresa];
      setEmpresas(lista);
      setEmpresaId(nuevaEmpresa);
      setNuevaEmpresa("");
      
      const actuales = await obtenerAjustes();
      if (!actuales) return;
      const guardadoOk = await syncSettingsToCloud({ ...actuales, empresas: lista, empresaActiva: nuevaEmpresa });
      if (guardadoOk) toast.success("Espacio creado", { description: `Se ha creado el espacio: ${nuevaEmpresa}` });
    }
  };

  // 🛡️ La confirmación real ocurre en el AlertDialog premium (ver JSX); esta función ya llega "confirmada".
  const confirmarEliminarEmpresa = async () => {
    if (!empresaAEliminar) return;
    const nombre = empresaAEliminar;
    setEmpresaAEliminar(null);

    const nuevaPapelera = [...papelera, { nombre, fecha: Date.now() }];
    const lista = empresas.filter(e => e !== nombre);
    const nuevaActiva = empresaId === nombre ? (lista[0] || "Mi Empresa Principal") : empresaId;

    const actuales = await obtenerAjustes();
    if (!actuales) return; // 🛡️ Si no podemos leer el estado real, no tocamos nada localmente ni en la nube.

    setPapelera(nuevaPapelera);
    setEmpresas(lista);
    setEmpresaId(nuevaActiva);

    const guardadoOk = await syncSettingsToCloud({ ...actuales, empresas: lista, empresaActiva: nuevaActiva, papelera: nuevaPapelera });
    if (guardadoOk) toast.info("Espacio borrado", { description: `El espacio ${nombre} se movió a la papelera.` });
  };

  const recuperarDePapelera = async (nombre: string) => {
    const lista = [...empresas, nombre];
    const nuevaPapelera = papelera.filter(item => item.nombre !== nombre);

    const actuales = await obtenerAjustes();
    if (!actuales) return;

    setEmpresas(lista);
    setPapelera(nuevaPapelera);
    setEmpresaId(nombre);

    const guardadoOk = await syncSettingsToCloud({ ...actuales, empresas: lista, empresaActiva: nombre, papelera: nuevaPapelera });
    if (guardadoOk) toast.success("Restaurado", { description: `El espacio "${nombre}" ha sido restaurado.` });
  };

  useEffect(() => {
    if (!empresaId || planActivo === 'loading' || planActivo === 'free') return;

    empresaSolicitadaRef.current = empresaId;

    setRolUsuario("LOADING");
    setData([]);
    setIsLoadingData(true);

    verificarRolUsuario(empresaId).then(async (res) => {
        if (empresaSolicitadaRef.current !== empresaId) return; // Respuesta obsoleta: ya se cambió de empresa
        setRolUsuario(res.rol);

        // 🔄 AUTOMATIZACIÓN DE RECURRENTES: antes de pintar el Libro Mayor, nos aseguramos de que
        // los gastos/ingresos fijos que tocaba registrar desde la última visita ya estén al día.
        if (res.rol === "PROPIETARIO") {
            try {
                const resultado = await generarRecurrentesPendientes(empresaId);
                if (empresaSolicitadaRef.current === empresaId && resultado?.creadas > 0) {
                    toast.success("Recurrentes al día", {
                        description: `Se ${resultado.creadas === 1 ? 'ha generado' : 'han generado'} automáticamente ${resultado.creadas} movimiento${resultado.creadas === 1 ? '' : 's'} recurrente${resultado.creadas === 1 ? '' : 's'} que tocaba registrar.`
                    });
                }
            } catch { /* si falla, seguimos sin bloquear la carga de datos */ }
        }

        if (empresaSolicitadaRef.current !== empresaId) return;
        obtenerDatosSupabase(empresaId).then(d => {
          if (empresaSolicitadaRef.current !== empresaId) return; // Ignoramos datos de una empresa que ya no está seleccionada
          if (d && d.length > 0) setData(d);
          setIsLoadingData(false);
        }).catch(() => { if (empresaSolicitadaRef.current === empresaId) setIsLoadingData(false); });
    });

    obtenerAjustesSilencioso()
      .then((ajustesGuardados: any) => {
         if (empresaSolicitadaRef.current !== empresaId) return; // Respuesta obsoleta: ignorada
         const idAjuste = empresaId.startsWith("CLIENTE|") ? empresaId.split('|')[2] : empresaId;

         if (ajustesGuardados.metas && ajustesGuardados.metas[idAjuste]) {
           setMetaMensual(ajustesGuardados.metas[idAjuste]);
           setInputMeta(ajustesGuardados.metas[idAjuste].toString());
         } else {
           setMetaMensual(5000);
           setInputMeta("5000");
         }

         if (ajustesGuardados.perfiles && ajustesGuardados.perfiles[idAjuste]) {
           setPerfilEmpresa(ajustesGuardados.perfiles[idAjuste]);
           setSectorInput(ajustesGuardados.perfiles[idAjuste].sector);
           setObjetivoInput(ajustesGuardados.perfiles[idAjuste].objetivo);
         } else {
           setPerfilEmpresa({ sector: "", objetivo: "" });
           setSectorInput("");
           setObjetivoInput("");
         }

         if (ajustesGuardados.datosFiscales && ajustesGuardados.datosFiscales[idAjuste]) {
            setDatosFiscales(ajustesGuardados.datosFiscales[idAjuste]);
         } else {
            setDatosFiscales({ razonSocial: "", nif: "", direccion: "" });
         }

         if (ajustesGuardados.categorias && ajustesGuardados.categorias[idAjuste]) {
           setCategoriasIngreso(ajustesGuardados.categorias[idAjuste].ingreso);
           setCategoriasGasto(ajustesGuardados.categorias[idAjuste].gasto);
           setCatsIngresoInput(ajustesGuardados.categorias[idAjuste].ingreso.join(", "));
           setCatsGastoInput(ajustesGuardados.categorias[idAjuste].gasto.join(", "));
         } else {
           setCategoriasIngreso(defaultIngresos);
           setCategoriasGasto(defaultGastos);
           setCatsIngresoInput(defaultIngresos.join(", "));
           setCatsGastoInput(defaultGastos.join(", "));
         }
      });

    setChatMessages([]);

  }, [empresaId, planActivo]);

  const guardarPerfil = async () => {
    const nuevoPerfil = { sector: sectorInput, objetivo: objetivoInput };

    const nuevasIngreso = catsIngresoInput.split(',').map(c => c.trim()).filter(c => c);
    const nuevasGasto = catsGastoInput.split(',').map(c => c.trim()).filter(c => c);
    
    const catA_Guardar = {
       ingreso: nuevasIngreso.length > 0 ? nuevasIngreso : defaultIngresos,
       gasto: nuevasGasto.length > 0 ? nuevasGasto : defaultGastos
    };

    const actuales = await obtenerAjustes();
    if (!actuales) return; // 🛡️ Sin conexión: no aplicamos los cambios para no perder ajustes reales.

    setPerfilEmpresa(nuevoPerfil);
    setCategoriasIngreso(catA_Guardar.ingreso);
    setCategoriasGasto(catA_Guardar.gasto);

    const perfilesObj = actuales.perfiles || {};
    perfilesObj[empresaId] = nuevoPerfil;
    const categoriasObj = actuales.categorias || {};
    categoriasObj[empresaId] = catA_Guardar;
    
    const fiscalesObj = actuales.datosFiscales || {};
    fiscalesObj[empresaId] = datosFiscales;

    const guardadoOk = await syncSettingsToCloud({ ...actuales, perfiles: perfilesObj, categorias: categoriasObj, datosFiscales: fiscalesObj });
    if (guardadoOk) {
      setShowConfig(false);
      toast.success("Configuración Guardada", { description: "Perfil de IA, categorías y datos fiscales actualizados." });
    }
  };

  const cargarAsesores = async () => {
      const lista = await obtenerAsesores(empresaId);
      setListaAsesores(lista);
  };

  const manejarInvitarAsesor = async (e: React.FormEvent) => {
      e.preventDefault();
      const emailLimpio = asesorEmail.trim().toLowerCase();
      if (!emailLimpio) return;
      // 🛡️ BLINDAJE DE DATOS: sin esto, un email mal escrito se guardaba igualmente en la base de
      // datos y el "asesor invitado" nunca podría entrar, sin que nadie se diera cuenta del error.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
          toast.error("Email no válido", { description: "Revisa el correo del asesor antes de invitarlo." });
          return;
      }
      setIsInviting(true);
      const res = await invitarAsesor(empresaId, emailLimpio);
      if (res.success) {
          toast.success("Asesor Invitado", { description: "Ahora puede visualizar tu libro mayor." });
          setAsesorEmail("");
          cargarAsesores();
      } else {
          toast.error("Error", { description: res.error });
      }
      setIsInviting(false);
  };

  const manejarRevocarAsesor = async (id: number) => {
      const res = await revocarAsesor(id);
      if (res.success) {
          toast.info("Acceso Revocado", { description: "El gestor ya no tiene acceso a tus datos." });
          cargarAsesores();
      }
  };

  // 🚀 RENDIMIENTO: toda esta cadena de cálculos derivados (filtrado, orden, gráfico,
  // KPIs, alertas...) se memoiza para que escribir en el buscador o cambiar de página
  // no recalcule desde cero el Libro Mayor completo en cada pulsación de tecla.
  const datosVisibles = useMemo(() => data.filter(item => {
    if (filtro === "all") return true;
    const ahora = new Date().getTime();
    const [d, m, y] = item.name.split('/');
    const fechaItem = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    const diffDias = (ahora - fechaItem) / (1000 * 60 * 60 * 24);
    return diffDias <= determinarRangoDias(filtro);
  }), [data, filtro]);

  const datosFinancieros = useMemo(() => datosVisibles.filter((item: any) => {
     const isPresupuesto = item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-');
     return !isPresupuesto;
  }), [datosVisibles]);

  const chartData = useMemo(() => {
    const datosCronologicos = [...datosFinancieros].sort((a, b) => {
      const pA = a.name.split('/');
      const pB = b.name.split('/');
      return new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime() - new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime();
    });

    return datosCronologicos.reduce((acc: any[], curr: any) => {
      const [d, m, y] = curr.name.split('/');
      let clave = curr.name; 
      
      if (filtro === 'year' || filtro === 'all') {
        const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        clave = `${nombresMeses[Number(m) - 1]} ${y}`; 
      }

      const baseVal = Math.abs(Number(curr.total));
      const ivaVal = Number(curr.iva) || 0;
      const totalConIva = baseVal * (1 + ivaVal / 100);
      
      const isIngreso = Number(curr.total) > 0;
      
      const existente = acc.find((item: any) => item.name === clave);
      
      if (existente) {
        if (isIngreso) existente.Ingresos += totalConIva;
        else existente.Gastos += totalConIva;
      } else {
        acc.push({ 
          name: clave, 
          rawDate: curr.name,
          Ingresos: isIngreso ? totalConIva : 0, 
          Gastos: !isIngreso ? totalConIva : 0 
        });
      }
      return acc;
    }, []);
  }, [datosFinancieros, filtro]);

  const datosTabla = useMemo(() => [...datosVisibles].sort((a, b) => {
    const pA = a.name.split('/');
    const pB = b.name.split('/');
    return new Date(Number(pB[2]), Number(pB[1]) - 1, Number(pB[0])).getTime() - new Date(Number(pA[2]), Number(pA[1]) - 1, Number(pA[0])).getTime();
  }), [datosVisibles]);

  const proyectosUnicos = useMemo(() => Array.from(new Set(datosTabla.map(item => {
      const match = item.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
      return match ? match[1] : null;
  }).filter(Boolean))) as string[], [datosTabla]);

  const facturasPendientes = useMemo(() => datosFinancieros.filter(d => d.estado_pago === 'PENDIENTE'), [datosFinancieros]);
  
  const cobrosPendientesTotal = useMemo(() => facturasPendientes.filter(d => Number(d.total) > 0).reduce((acc, curr) => acc + (Math.abs(Number(curr.total)) * (1 + (Number(curr.iva)||0)/100)), 0), [facturasPendientes]);
  const pagosPendientesTotal = useMemo(() => facturasPendientes.filter(d => Number(d.total) < 0).reduce((acc, curr) => acc + (Math.abs(Number(curr.total)) * (1 + (Number(curr.iva)||0)/100)), 0), [facturasPendientes]);

  const datosTablaFiltrados = useMemo(() => {
    const filtrados = datosTabla.filter(item => {
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
         const coincideFactura = item.numero_factura?.toLowerCase().includes(searchLower);
         const coincideCliente = item.cliente_nombre?.toLowerCase().includes(searchLower);
         const coincideProyecto = item.concepto_detalle?.toLowerCase().includes(searchLower);
         const coincideCif = item.cif?.toLowerCase().includes(searchLower);
         if (!coincideCategoria && !coincideMonto && !coincideFactura && !coincideCliente && !coincideProyecto && !coincideCif) return false;
      }

      const isPresupuesto = item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-');
      const isAbono = item.numero_factura?.startsWith('R-');
      const isIngreso = Number(item.total) > 0 && !isPresupuesto;
      const isGasto = Number(item.total) < 0 && !isAbono && !isPresupuesto;

      if (filtroDoc === 'ingresos' && !isIngreso) return false;
      if (filtroDoc === 'gastos' && !isGasto) return false;
      if (filtroDoc === 'presupuestos' && !isPresupuesto) return false;
      if (filtroDoc === 'abonos' && !isAbono) return false;
      if (filtroDoc === 'pendientes' && item.estado_pago !== 'PENDIENTE') return false;
      
      if (filtroDoc === 'proyectos') {
          const matchProy = item.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
          if (!matchProy) return false; 
          
          if (proyectoSeleccionadoFiltro !== 'todos' && matchProy[1] !== proyectoSeleccionadoFiltro) return false;
          if (subFiltroProyecto === 'ingresos' && Number(item.total) <= 0) return false;
          if (subFiltroProyecto === 'gastos' && Number(item.total) >= 0) return false;
      }

      return true;
    });

    // 🚀 LIBRO MAYOR PRO: ordenación por columna (fecha, categoría o importe), ascendente o descendente
    return [...filtrados].sort((a, b) => {
      let comparacion = 0;
      if (sortConfig.key === 'fecha') comparacion = parseFechaTS(a) - parseFechaTS(b);
      else if (sortConfig.key === 'categoria') comparacion = (a.categoria || '').localeCompare(b.categoria || '');
      else if (sortConfig.key === 'importe') comparacion = Math.abs(Number(a.total)) - Math.abs(Number(b.total));
      return sortConfig.direction === 'asc' ? comparacion : -comparacion;
    });
  }, [datosTabla, chartFilter, filtro, searchTerm, filtroDoc, proyectoSeleccionadoFiltro, subFiltroProyecto, sortConfig]);

  const toggleSort = (key: 'fecha' | 'categoria' | 'importe') => {
    setSortConfig(prev => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'fecha' ? 'desc' : 'asc' });
    setCurrentPage(1);
  };

  const EncabezadoOrdenable = ({ label, columnKey }: { label: string; columnKey: 'fecha' | 'categoria' | 'importe' }) => (
    <button
      type="button"
      onClick={() => toggleSort(columnKey)}
      className={`flex items-center gap-1 uppercase tracking-wider font-bold transition hover:text-slate-700 ${sortConfig.key === columnKey ? 'text-blue-600' : ''}`}
      title={`Ordenar por ${label}`}
    >
      {label}
      <span className="flex flex-col -space-y-1 text-[8px] leading-none">
        <span className={sortConfig.key === columnKey && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}>▲</span>
        <span className={sortConfig.key === columnKey && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}>▼</span>
      </span>
    </button>
  );

  const totalPages = Math.ceil(datosTablaFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = useMemo(() => datosTablaFiltrados.slice(startIndex, startIndex + itemsPerPage), [datosTablaFiltrados, startIndex, itemsPerPage]);

  const { ingresosTotales, gastosTotales, beneficioNeto, ivaRepercutido, ivaSoportado, liquidacionIva } = useMemo(() => {
    const ingresos = datosFinancieros.filter(d => Number(d.total) > 0).reduce((sum, item) => sum + (Math.abs(Number(item.total)) * (1 + (Number(item.iva) || 0) / 100)), 0);
    const gastos = datosFinancieros.filter(d => Number(d.total) < 0).reduce((sum, item) => sum + (Math.abs(Number(item.total)) * (1 + (Number(item.iva) || 0) / 100)), 0);
    const ivaRep = datosFinancieros.filter(d => Number(d.total) > 0).reduce((sum, item) => sum + (Math.abs(Number(item.total)) * ((Number(item.iva) || 0) / 100)), 0);
    const ivaSop = datosFinancieros.filter(d => Number(d.total) < 0).reduce((sum, item) => sum + (Math.abs(Number(item.total)) * ((Number(item.iva) || 0) / 100)), 0);
    return {
      ingresosTotales: ingresos,
      gastosTotales: gastos,
      beneficioNeto: ingresos - gastos,
      ivaRepercutido: ivaRep,
      ivaSoportado: ivaSop,
      liquidacionIva: ivaRep - ivaSop,
    };
  }, [datosFinancieros]);

  const alertasDinamicas = useMemo(() => {
    const alertas: { tipo: string, titulo: string, texto: string }[] = [];
    if (datosFinancieros.length === 0) return alertas;

    if (facturasPendientes.length > 0) {
      alertas.push({ tipo: 'critico', titulo: '💸 Alerta de Tesorería', texto: `Tienes ${facturasPendientes.length} facturas pendientes de cobro o pago. Revisa el módulo superior.` });
    }

    if (beneficioNeto < 0) {
      alertas.push({ tipo: 'critico', titulo: '🚨 Flujo de Caja Negativo', texto: `Las salidas superan a las entradas en ${Math.abs(beneficioNeto).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €. Riesgo de liquidez.` });
    } 

    return alertas;
  }, [datosFinancieros, facturasPendientes, beneficioNeto]);

  const escanearFactura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🛡️ BLINDAJE: feedback inmediato antes de subir nada (el servidor vuelve a comprobarlo por seguridad)
    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Archivo demasiado grande", { description: "El máximo permitido es 10MB. Comprime la imagen o el PDF." });
      e.target.value = "";
      return;
    }
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error("Formato no soportado", { description: "Sube una imagen (JPG, PNG, WEBP) o un PDF." });
      e.target.value = "";
      return;
    }

    setIsScanning(true);
    setConfianzaIA(null); 
    setEvidenciaIA(null);
    
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
        
        if (res.data.nif) setCifEmisor(res.data.nif);
        if (res.data.numero_factura) setNumFactura(res.data.numero_factura);
        
        if (res.data.confianza) setConfianzaIA(res.data.confianza);
        if (res.data.evidencia) setEvidenciaIA(res.data.evidencia);

        if (res.data.url_archivo) setUrlArchivoTemporal(res.data.url_archivo);
        if (res.data.nombre_archivo) setNombreArchivoTemporal(res.data.nombre_archivo);
        if (res.data.tipo_archivo) setTipoArchivoTemporal(res.data.tipo_archivo);
        
        toast.success("Documento Escaneado", { description: "La IA ha procesado tu ticket con éxito." });

      } else {
        toast.error("Error de Auditoría IA", { description: res.error || "Fallo desconocido" });
      }
    } catch (err) {
      toast.error("Error de Conexión", { description: "No se pudo conectar con el escáner OCR." });
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
          toast.success("Importación Exitosa", { description: `Se han importado y clasificado ${dataRes.count} movimientos bancarios.` });
          const actualizadosBD = await obtenerDatosSupabase(empresaId);
          setData(actualizadosBD);
        } else {
          toast.error("Error de Importación", { description: dataRes.error || "Fallo desconocido" });
        }
      } catch (err) {
        toast.error("Error de Conexión", { description: "No se pudo procesar el archivo bancario." });
      } finally {
        setIsImporting(false);
        if (fileInputCsvRef.current) fileInputCsvRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  const guardarDato = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setFormErrors({});

    if (!empresaId) return toast.warning("Espacio Requerido", { description: "Por favor, selecciona un Espacio de Trabajo." });

    // 🛡️ BLINDAJE DE DATOS: validación estricta con Zod antes de tocar la base de datos.
    // El modo "proyecto" tiene sus propios importes por línea, así que solo exigimos la fecha.
    if (tipoTransaccion === 'proyecto') {
      if (!mes) return toast.warning("Fecha Requerida", { description: "Por favor, selecciona una fecha operativa." });
    } else {
      const validacion = transaccionSchema.safeParse({ mes, ingreso, categoria, cifEmisor });
      if (!validacion.success) {
        const errores = mapearErroresZod(validacion.error);
        setFormErrors(errores);
        toast.error("Revisa el formulario", { description: Object.values(errores)[0] });
        return;
      }
    }

    setIsSaving(true);
    
    try {
      const [y, m, d] = mes.split('-');
      const fecha = `${d}/${m}/${y}`;
      
      const numeroLimpio = parsearImporte(ingreso);

      if (isNaN(numeroLimpio) && tipoTransaccion !== 'proyecto') {
         setIsSaving(false);
         return toast.error("Importe Inválido", { description: "Usa solo números y comas/puntos." });
      }

      const valorFinal = tipoTransaccion === 'gasto' ? -Math.abs(numeroLimpio) : Math.abs(numeroLimpio);

      if (tipoTransaccion !== 'proyecto') {
          const esDuplicado = data.some(item => {
             const mismaFecha = item.name === fecha;
             const mismoTotal = Math.abs(Number(item.total)) === Math.abs(numeroLimpio);
             const mismoTipo = (Number(item.total) >= 0) === (valorFinal >= 0);
             const mismoNif = cifEmisor ? (item.cif === cifEmisor) : true;
             const mismaFactura = numFactura ? (item.numero_factura === numFactura) : true;
             
             return mismaFecha && mismoTotal && mismoTipo && (cifEmisor || numFactura ? (mismoNif && mismaFactura) : true);
          });

          if (esDuplicado) {
              setIsSaving(false);
              toast.error("🛡️ Escudo Antiduplicados", { description: "Este documento ya está en tu Libro Mayor. Guardado bloqueado por seguridad." });
              return;
          }
      }

      if (tipoTransaccion === 'proyecto') {
          const proyName = proyecto.trim().toUpperCase();
          if (!proyName) { setIsSaving(false); return toast.warning("Dato Obligatorio", { description: "Debe indicar el Nombre del Proyecto." }); }
          
          const promesas = [];
          const tagProyecto = ` [PROYECTO: ${proyName}]`;

          for (const ing of proyectoIngresos) {
              const numI = parseFloat(ing.importe.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
              if (!isNaN(numI) && numI > 0) {
                  promesas.push(guardarDatoSupabase({
                      month: fecha, total: Math.abs(numI), categoria: ing.categoria, iva: ing.iva,
                      empresaId, isRecurrent: false, frecuencia: null, estado_pago: 'COBRADO',
                      concepto_detalle: (ing.concepto.trim() || "Ingreso asociado") + tagProyecto
                  }));
              }
          }
          for (const g of proyectoGastos) {
              const numG = parseFloat(g.importe.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
              if (!isNaN(numG) && numG > 0) {
                  promesas.push(guardarDatoSupabase({
                      month: fecha, total: -Math.abs(numG), categoria: g.categoria, iva: g.iva,
                      empresaId, isRecurrent: false, frecuencia: null, estado_pago: 'PAGADO',
                      concepto_detalle: (g.concepto.trim() || "Coste asociado") + tagProyecto
                  }));
              }
          }

          await Promise.all(promesas);
          const actualizadosBD = await obtenerDatosSupabase(empresaId);
          setData(actualizadosBD);
          
          setProyecto(''); 
          setProyectoIngresos([{ id: Date.now(), concepto: "", importe: "", categoria: categoriasIngreso[0] || "Ventas", iva: "21" }]);
          setProyectoGastos([{ id: Date.now() + 1, concepto: "", importe: "", categoria: categoriasGasto[0] || "Logística", iva: "21" }]);
          setIsSaving(false);
          toast.success("Proyecto Registrado", { description: "El proyecto y todos sus movimientos han sido guardados." });
          return;
      }
      
      let ivaFinal = ivaSeleccionado;
      if (tipoTransaccion === 'gasto' && isVehiculo) {
         ivaFinal = (Number(ivaSeleccionado) / 2).toString();
      }

      const detalleAdicional = (tipoTransaccion === 'gasto' && isVehiculo) ? " (Gasto Vehículo: IVA 50% deducible)" : "";
      const tagProyecto = proyecto.trim() ? ` [PROYECTO: ${proyecto.toUpperCase()}]` : "";
      
      const res = await guardarDatoSupabase({ 
        month: fecha, 
        total: valorFinal, 
        categoria: categoria, 
        iva: ivaFinal,
        cif: cifEmisor, 
        numero_factura: numFactura,
        estado_pago: estadoPago, 
        empresaId: empresaId, 
        isRecurrent: isRecurrent,
        frecuencia: isRecurrent ? frecuencia : null,
        concepto_detalle: detalleAdicional + tagProyecto,
        url_archivo: urlArchivoTemporal,
        nombre_archivo: nombreArchivoTemporal,
        tipo_archivo: tipoArchivoTemporal
      });

      if (res.success) {
        const actualizadosBD = await obtenerDatosSupabase(empresaId);
        setData(actualizadosBD);
        setIngreso(''); setProyecto(''); setCifEmisor(''); setNumFactura('');
        setIsRecurrent(false); setIsVehiculo(false);
        setFrecuencia('Mensual'); setIvaSeleccionado("21"); 
        
        setConfianzaIA(null); setEvidenciaIA(null); setUrlArchivoTemporal(null);
        setNombreArchivoTemporal(null); setTipoArchivoTemporal(null);
        
        toast.success("Movimiento Guardado", { description: "La transacción se ha registrado en el Libro Mayor." });
      } else {
        toast.error("Fallo de Servidor", { description: res.error || "Error al guardar en la nube." });
      }
    } catch (error) {
      toast.error("Sin Conexión", { description: "Revisa tu conexión a internet al intentar guardar." });
    } finally {
      setIsSaving(false);
    }
  };

  // 🛡️ Ya no usamos window.confirm: la confirmación se muestra con un AlertDialog premium (ver JSX).
  const confirmarEliminarDato = async () => {
    if (deleteTargetId === null) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);

    const res = await borrarDatoSupabase(id.toString(), empresaId);
    if (res.success) {
      const restantes = data.filter(item => item.id !== id);
      setData(restantes);
      toast.success("Registro Eliminado", { description: "La transacción se ha borrado correctamente." });
    } else {
        toast.error("Error", { description: res.error || "No se pudo borrar la transacción." });
    }
  };

  const iniciarEdicion = (item: any) => {
    setEditFormErrors({});
    setEditingId(item.id);
    const [d, m, y] = item.name.split('/');
    const tagMatch = item.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);

    let estadoInicial = item.estado_pago || "PAGADO";
    if (estadoInicial !== "PENDIENTE") {
         estadoInicial = Number(item.total) > 0 ? "COBRADO" : "PAGADO";
    }

    setEditFormData({
      tipo: Number(item.total) >= 0 ? 'ingreso' : 'gasto',
      mes: `${y}-${m}-${d}`,
      ingreso: Math.abs(Number(item.total)).toString(),
      categoria: item.categoria || 'General',
      ivaSeleccionado: item.iva?.toString() || '0',
      proyecto: tagMatch ? tagMatch[1] : "",
      conceptoOriginal: item.concepto_detalle || "",
      estado_pago: estadoInicial
    });
  };

  const guardarEdicion = async (id: any) => {
    setEditFormErrors({});

    // 🛡️ BLINDAJE DE DATOS: misma validación estricta que en el alta de movimientos.
    const validacion = transaccionSchema.safeParse({
      mes: editFormData.mes,
      ingreso: editFormData.ingreso,
      categoria: editFormData.categoria,
    });
    if (!validacion.success) {
      const errores = mapearErroresZod(validacion.error);
      setEditFormErrors(errores);
      toast.error("Revisa los cambios", { description: Object.values(errores)[0] });
      return;
    }

    try {
      const [y, m, d] = editFormData.mes.split('-');
      const fecha = `${d}/${m}/${y}`;
      const numeroLimpio = parsearImporte(editFormData.ingreso);
      
      if (isNaN(numeroLimpio)) return toast.error("Importe Inválido", { description: "El importe introducido no es válido." });

      const valorFinal = editFormData.tipo === 'gasto' ? -Math.abs(numeroLimpio) : Math.abs(numeroLimpio);

      let nuevoConcepto = editFormData.conceptoOriginal.replace(/\[PROYECTO:\s*(.*?)\]/g, '').trim();
      if (editFormData.proyecto.trim()) {
          nuevoConcepto += ` [PROYECTO: ${editFormData.proyecto.toUpperCase()}]`;
      }

      const res = await editarDatoSupabase({ 
        id: id, 
        month: fecha, 
        total: valorFinal, 
        categoria: editFormData.categoria, 
        iva: editFormData.ivaSeleccionado,
        estado_pago: editFormData.estado_pago,
        concepto_detalle: nuevoConcepto.trim(),
        empresaId: empresaId
      });

      if (res.success) {
        const actualizadosBD = await obtenerDatosSupabase(empresaId);
        setData(actualizadosBD);
        setEditingId(null);
        toast.success("Movimiento Actualizado", { description: "Los cambios se han guardado correctamente." });
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch (error) {
      toast.error("Error", { description: "Error al actualizar el dato en el servidor." });
    }
  };

  const marcarComoPagado = async (id: any) => {
      try {
          const transaccion = data.find(d => d.id === id);
          if (!transaccion) return;
          
          let nuevoEstado = 'PENDIENTE';
          if (transaccion.estado_pago === 'PENDIENTE') {
              nuevoEstado = Number(transaccion.total) > 0 ? 'COBRADO' : 'PAGADO';
          }
          
          const res = await actualizarEstadoPago(Number(id), nuevoEstado, empresaId);
          
          if (res.success) {
              const actualizadosBD = await obtenerDatosSupabase(empresaId);
              setData(actualizadosBD);
              toast.success("✅ Tesorería Actualizada", { description: `El documento se ha marcado como ${nuevoEstado} exitosamente.` });
          } else {
              toast.error("Error", { description: res.error || "No se pudo actualizar el estado de pago." });
          }
      } catch (error) {
          toast.error("Error", { description: "Fallo de conexión con el servidor." });
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

    const datosContexto = datosFinancieros.map(d => {
      let estadoLbl = d.estado_pago || 'PAGADO';
      if (estadoLbl !== 'PENDIENTE') {
          estadoLbl = Number(d.total) > 0 ? 'COBRADO' : 'PAGADO';
      }
      return { 
        fecha: d.name, 
        categoria: d.categoria, 
        importe: d.total, 
        cliente: d.cif || 'Desconocido', 
        concepto: d.concepto_detalle || 'General', 
        factura: d.numero_factura || 'Manual',
        estado: estadoLbl
      };
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historial,
          contextoFinanciero: datosContexto,
          empresaId: nombreEmpresaVisual,
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
    if (datosTablaFiltrados.length === 0) return toast.info("Sin datos", { description: "No hay datos para exportar con los filtros actuales." });
    
    let csvContent = "\uFEFFFecha;Nº Documento;Emisor/NIF;Proyecto;Categoría;Estado;Tipo;Base Imponible (EUR);IVA (%);Cuota IVA (EUR);Total (EUR)\n";
    
    datosTablaFiltrados.forEach(row => {
      const isPresupuesto = row.categoria === 'Presupuestos' || row.numero_factura?.startsWith('P-');
      const isAbono = row.numero_factura?.startsWith('R-');
      const baseNum = Math.abs(Number(row.total));
      
      let tipoTxt = "Ingreso";
      if (isPresupuesto) tipoTxt = "PRESUPUESTO";
      else if (isAbono) tipoTxt = "ABONO";
      else if (Number(row.total) < 0) tipoTxt = "Gasto";

      let estadoLabel = row.estado_pago || 'PAGADO';
      if (estadoLabel !== 'PENDIENTE') {
          estadoLabel = Number(row.total) > 0 ? 'COBRADO' : 'PAGADO';
      }

      const ivaPorcentaje = Number(row.iva) || 0;
      const cuotaIva = baseNum * (ivaPorcentaje / 100);
      const totalFinal = baseNum + cuotaIva;

      const tagMatch = row.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
      const proyectoStr = tagMatch ? tagMatch[1] : "-";
      const fNum = (num: number) => num.toFixed(2).replace('.', ',');

      csvContent += `${row.name};${celdaCSVSegura(row.numero_factura || 'S/N')};${celdaCSVSegura(row.cif || 'S/N')};${celdaCSVSegura(proyectoStr)};${celdaCSVSegura(row.categoria || "General")};${estadoLabel};${tipoTxt};${fNum(baseNum)};${ivaPorcentaje}%;${fNum(cuotaIva)};${fNum(totalFinal)}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Libro_Mayor_${nombreEmpresaVisual.replace(/\s+/g, '')}_${filtroDoc}.csv`;
    link.click();
  };

  if (!isMounted) return null;
  
  if (planActivo === 'loading' && isSignedIn) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Preparando entorno seguro...</h2>
           <p className="text-sm font-medium text-slate-500 mb-6">Comprobando credenciales y conexión cifrada</p>
           
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

      {/* 🛡️ Confirmación de borrado premium: sustituye al window.confirm() nativo del navegador */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento se borrará de forma permanente del Libro Mayor y de tus cálculos de IVA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarDato} className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🛡️ Confirmación de borrado premium: sustituye al window.confirm() nativo del navegador */}
      <AlertDialog open={empresaAEliminar !== null} onOpenChange={(open) => { if (!open) setEmpresaAEliminar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar el espacio "{empresaAEliminar}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se moverá a la papelera de reciclaje durante 7 días, tiempo en el que podrás restaurarlo sin perder ningún dato. Transcurrido ese plazo se eliminará de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarEmpresa} className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500">
              Sí, borrar espacio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              
              <div className="mb-6 px-2 w-full">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Espacio de Trabajo</label>
                <div className="flex gap-2 mt-1 w-full relative">
                    <select 
                      value={empresaId} 
                      onChange={manejarCambioEmpresa} 
                      className="flex-1 bg-slate-800 text-white text-sm font-bold p-2.5 rounded-xl border border-slate-700 outline-none w-full"
                      style={{ textOverflow: 'ellipsis' }}
                    >
                        <optgroup label="Mis Espacios Personales">
                            {empresas.map(e => <option key={`PROPIO_${e}`} value={e}>{e}</option>)}
                        </optgroup>
                        
                        {espaciosCliente.length > 0 && (
                            <optgroup label="Clientes (Modo Asesor)">
                                {espaciosCliente.map(c => <option key={c.idCompleto} value={c.idCompleto}>👁️ {c.nombreVisible}</option>)}
                            </optgroup>
                        )}
                    </select>
                    
                    {rolUsuario !== 'LECTURA' && rolUsuario !== 'LOADING' && (
                        <>
                            <button onClick={() => {setShowAsesorModal(true); setIsSidebarOpen(false); cargarAsesores();}} className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition border border-slate-700 shrink-0" title="Invitar Asesor">
                              👥
                            </button>
                            <button onClick={() => {setShowConfig(true); setIsSidebarOpen(false);}} className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition border border-slate-700 shrink-0" title="Configurar Perfil y Categorías">
                              ⚙️
                            </button>
                        </>
                    )}
                </div>
                
                {rolUsuario !== 'LECTURA' && rolUsuario !== 'LOADING' && (
                    <div className="flex gap-2 mt-2">
                      <input value={nuevaEmpresa} onChange={(e) => setNuevaEmpresa(e.target.value)} placeholder="Nueva empresa..." className="w-full bg-slate-800 p-2 text-xs text-white rounded-lg border border-slate-700 outline-none" />
                      <button onClick={agregarEmpresa} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-500 transition">+</button>
                    </div>
                )}
              </div>
              
              <nav className="space-y-1">
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/" onClick={() => setIsSidebarOpen(false)}>
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 hover:text-white transition" href="/documentos" onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                  Gestor Documental
                </Link>
              </nav>
            </div>
            
            <div className="mt-auto">
              {planActivo === 'pro' || planActivo === 'autonomo' ? (
                <button onClick={gestionarSuscripcion} className="w-full flex items-center justify-between p-3 rounded-2xl border mb-3 transition cursor-pointer bg-emerald-900/20 border-emerald-900/50 hover:bg-emerald-900/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-500"></span>
                    <span className="text-xs font-bold text-emerald-400">Plan Activo</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md text-emerald-300 bg-emerald-900/50 hover:bg-emerald-800/80 transition">Gestionar</span>
                </button>
              ) : (
                <Link href="/precios" className="w-full flex items-center justify-between p-3 rounded-2xl border mb-3 transition cursor-pointer bg-slate-800/50 border-slate-700 hover:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse bg-rose-500"></span>
                    <span className="text-xs font-bold text-slate-300">Suscripción Inactiva</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md text-slate-800 bg-white hover:bg-slate-200 transition">Activar</span>
                </Link>
              )}
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                <span className="text-xs font-semibold text-slate-400">Entorno Seguro</span>
                <UserButton/>
              </div>
            </div>
          </aside>

          {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

          <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
            
            {/* 🚀 SEGURIDAD VISUAL: MIENTRAS CARGA EL ROL, OCULTAMOS TODO PARA EVITAR PARPADEOS */}
            {rolUsuario === 'LOADING' ? (
                <div className="animate-pulse space-y-6">
                    <div className="h-10 bg-slate-200 rounded-xl w-1/3"></div>
                    <div className="h-32 bg-slate-200 rounded-xl w-full"></div>
                    <div className="grid grid-cols-3 gap-6"><div className="h-24 bg-slate-200 rounded-xl"></div><div className="h-24 bg-slate-200 rounded-xl"></div><div className="h-24 bg-slate-200 rounded-xl"></div></div>
                </div>
            ) : (
             <>
                {rolUsuario === 'LECTURA' && (
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-2xl mb-6 shadow-xl shadow-blue-900/20 flex flex-col sm:flex-row justify-between items-center gap-4 border border-blue-500">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl animate-pulse">👁️</span> 
                            <div>
                                <p className="text-xs font-black tracking-widest text-blue-200 uppercase mb-0.5">Modo Asesor Activo</p>
                                <p className="text-sm font-semibold">Estás visualizando los datos de <span className="font-black text-white">"{nombreEmpresaVisual}"</span> en Solo Lectura.</p>
                            </div>
                        </div>
                        <button onClick={salirModoAsesor} className="w-full sm:w-auto bg-white text-blue-700 px-6 py-2.5 rounded-xl font-black hover:bg-blue-50 transition shadow-lg flex items-center justify-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                           Salir a Mi Espacio
                        </button>
                    </div>
                )}

                <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 border-b border-slate-200 pb-6 gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Panel Ejecutivo - <span className="text-blue-600">{nombreEmpresaVisual}</span></h1>
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
                    </div>
                  </div>
                </header>

                {facturasPendientes.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl mb-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xl bg-amber-100 p-2 rounded-xl">⚠️</span>
                                <div>
                                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Tesorería en Alerta</h3>
                                    <p className="text-xs font-medium text-amber-700 mt-0.5">Tienes {facturasPendientes.length} facturas pendientes de cobro o pago.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 bg-white px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A Cobrar</p>
                                    <p className="text-sm font-black text-emerald-600">+{cobrosPendientesTotal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>
                                </div>
                                <div className="w-px bg-amber-100"></div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A Pagar</p>
                                    <p className="text-sm font-black text-rose-600">-{pagosPendientesTotal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto bg-white rounded-xl border border-amber-100">
                            <table className="min-w-full text-left whitespace-nowrap text-sm">
                                <thead className="bg-amber-50 text-[10px] font-black text-amber-700 uppercase">
                                    <tr>
                                        <th className="px-4 py-2">Fecha</th>
                                        <th className="px-4 py-2">Emisor / NIF</th>
                                        <th className="px-4 py-2">Concepto</th>
                                        <th className="px-4 py-2 text-right">Importe Total</th>
                                        {rolUsuario !== 'LECTURA' && <th className="px-4 py-2 text-center">Acción Inmediata</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-50 font-semibold text-slate-700">
                                    {facturasPendientes.map((item) => {
                                        const totalConIva = Math.abs(Number(item.total)) * (1 + (Number(item.iva)||0)/100);
                                        const esGasto = Number(item.total) < 0;
                                        
                                        const [d, m, y] = item.name.split('/');
                                        const fechaDoc = new Date(Number(y), Number(m)-1, Number(d)).getTime();
                                        const diasPasados = Math.floor((new Date().getTime() - fechaDoc) / (1000 * 60 * 60 * 24));
                                        const riesgoAlto = diasPasados > 30;

                                        return (
                                            <tr key={item.id} className="hover:bg-amber-50/30 transition">
                                                <td className="px-4 py-3">
                                                    <span className="block">{item.name}</span>
                                                    {riesgoAlto && (
                                                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1 inline-block">
                                                            🔴 +30 Días (Riesgo)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-900 block">{item.cif || "S/N"}</span>
                                                    <span className="text-[9px] text-slate-400">{item.numero_factura}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs">{item.concepto_detalle || item.categoria}</td>
                                                <td className={`px-4 py-3 text-right font-black ${esGasto ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {esGasto ? '-' : '+'}{totalConIva.toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                                                </td>
                                                {rolUsuario !== 'LECTURA' && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => marcarComoPagado(item.id)} className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition shadow-sm ${esGasto ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                                                            {esGasto ? "Pagar Ahora" : "Marcar Cobrado"}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 lg:gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                  <button onClick={() => setFiltro('all')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Histórico</button>
                  <button onClick={() => setFiltro('week')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'week' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Semana</button>
                  <button onClick={() => setFiltro('month')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'month' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Mes</button>
                  <button onClick={() => setFiltro('quarter')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'quarter' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Trimestre</button>
                  <button onClick={() => setFiltro('year')} className={`px-4 py-2 whitespace-nowrap rounded-xl text-xs font-bold transition shadow-sm border ${filtro === 'year' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>Año</button>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl mb-8 text-white flex flex-col xl:flex-row justify-between xl:items-center relative overflow-hidden gap-6 border border-slate-800">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
                   <div className="relative z-10 w-full xl:w-auto">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-xl">🛡️</span>
                         <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Escudo Fiscal Integrado</h3>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Liquidación estimada de IVA para el periodo actual.</p>
                   </div>
                   
                   <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 relative z-10 w-full xl:w-auto justify-between xl:justify-end">
                      <div className="text-left xl:text-right w-[45%] lg:w-auto">
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IVA Cobrado</p>
                         {isLoadingData ? <Skeleton className="h-6 w-24 bg-slate-700" /> : (
                           <p className="text-base md:text-lg font-black text-emerald-400">+{ivaRepercutido.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</p>
                         )}
                      </div>
                      <div className="text-left xl:text-right w-[45%] lg:w-auto">
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IVA Pagado</p>
                         {isLoadingData ? <Skeleton className="h-6 w-24 bg-slate-700" /> : (
                           <p className="text-base md:text-lg font-black text-rose-400">-{ivaSoportado.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</p>
                         )}
                      </div>
                      <div className="text-left xl:text-right w-full lg:w-auto xl:pl-6 xl:border-l xl:border-slate-700 pt-4 xl:pt-0 border-t border-slate-700 xl:border-t-0">
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Liquidación</p>
                         {isLoadingData ? <Skeleton className="h-8 w-32 bg-slate-700" /> : (
                           <p className={`text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 ${liquidacionIva > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                              <span>{liquidacionIva > 0 ? 'Pagar:' : 'A favor:'}</span>
                              <span>{Math.abs(liquidacionIva).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                           </p>
                         )}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total (Ingresos)</span>
                    {isLoadingData ? <Skeleton className="h-8 w-32 mt-3" /> : (
                      <span className="text-2xl md:text-3xl font-black text-emerald-500 tracking-tight mt-3">+ {ingresosTotales.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                    )}
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total (Gastos)</span>
                    {isLoadingData ? <Skeleton className="h-8 w-32 mt-3" /> : (
                      <span className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight mt-3">- {gastosTotales.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                    )}
                  </div>
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${beneficioNeto >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Flujo de Caja Libre</span>
                    {isLoadingData ? <Skeleton className="h-9 w-40 mt-3 ml-2" /> : (
                      <span className={`text-3xl font-black tracking-tight mt-3 ml-2 ${beneficioNeto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{beneficioNeto.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                  
                  {/* 🚀 CANDADO MODO ASESOR: Oculta el formulario si es lectura */}
                  <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    {rolUsuario !== 'LECTURA' ? (
                        <div>
                          <div className="flex flex-col gap-3 mb-6">
                            <h3 className="text-md font-bold text-slate-900">Añadir Transacción</h3>
                            <div className="grid grid-cols-2 gap-2 w-full">
                              <input type="file" accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={escanearFactura} />
                              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="justify-center text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1 shadow-sm disabled:opacity-50">
                                {isScanning ? "⏳ Leyendo..." : "📸 Factura OCR"}
                              </button>

                              <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputCsvRef} onChange={manejarImportarCSV} />
                              <button type="button" onClick={() => fileInputCsvRef.current?.click()} disabled={isImporting} className="justify-center text-[10px] font-bold bg-slate-50 text-slate-600 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1 shadow-sm disabled:opacity-50">
                                {isImporting ? "⏳ Cargando..." : "📊 Banco (CSV)"}
                              </button>
                            </div>
                            
                            {confianzaIA !== null && evidenciaIA && (
                              <div className="mt-1 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                                    Auditoría IA: Confianza {confianzaIA}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-emerald-600 font-medium italic">
                                  "{evidenciaIA}"
                                </p>
                              </div>
                            )}

                            {urlArchivoTemporal && (
                              <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-700 font-bold animate-fade-in-up">
                                <span>📎 {nombreArchivoTemporal || 'Documento adjunto'} listo para guardar</span>
                                <button type="button" onClick={() => {setUrlArchivoTemporal(null); setNombreArchivoTemporal(null); setTipoArchivoTemporal(null);}} className="ml-auto text-rose-500 hover:text-rose-700">✖</button>
                              </div>
                            )}
                          </div>

                          <form onSubmit={guardarDato} className="space-y-4">
                            <div className="grid grid-cols-3 gap-3 mb-2 bg-slate-100 p-1.5 rounded-2xl">
                              <button type="button" onClick={() => { setTipoTransaccion('ingreso'); setFormErrors({}); }} className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition shadow-sm ${tipoTransaccion === 'ingreso' ? 'bg-white text-emerald-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>+ Ingreso</button>
                              <button type="button" onClick={() => { setTipoTransaccion('gasto'); setFormErrors({}); }} className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition shadow-sm ${tipoTransaccion === 'gasto' ? 'bg-white text-rose-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>- Gasto</button>
                              <button type="button" onClick={() => { setTipoTransaccion('proyecto'); setFormErrors({}); }} className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition shadow-sm ${tipoTransaccion === 'proyecto' ? 'bg-purple-600 text-white border border-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>🎯 Proyecto</button>
                            </div>

                            {tipoTransaccion !== 'proyecto' ? (
                              <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Operativa</label>
                                    <input type="date" value={mes} onChange={(e) => { setMes(e.target.value); if (formErrors.mes) setFormErrors({ ...formErrors, mes: '' }); }} className={`w-full p-3 bg-white border text-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 ${formErrors.mes ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                    {formErrors.mes && <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.mes}</p>}
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

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NIF/CIF Emisor (Opcional)</label>
                                      <input type="text" placeholder="Ej: B12345678" value={cifEmisor} onChange={(e) => { setCifEmisor(e.target.value.toUpperCase()); if (formErrors.cifEmisor) setFormErrors({ ...formErrors, cifEmisor: '' }); }} className={`w-full p-2 bg-white border text-slate-900 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 ${formErrors.cifEmisor ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                      {formErrors.cifEmisor && <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.cifEmisor}</p>}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº Factura (Opcional)</label>
                                      <input type="text" placeholder="Ej: F-2026-104" value={numFactura} onChange={(e) => setNumFactura(e.target.value.toUpperCase())} className="w-full p-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Imponible (€)</label>
                                      <input type="text" inputMode="decimal" placeholder="Ej: 500.50" value={ingreso} onChange={(e) => { setIngreso(e.target.value); if (formErrors.ingreso) setFormErrors({ ...formErrors, ingreso: '' }); }} className={`w-full p-3 bg-white border text-slate-900 placeholder-slate-400 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 ${formErrors.ingreso ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                      {formErrors.ingreso && <p className="text-[10px] font-bold text-rose-500 mt-1">{formErrors.ingreso}</p>}
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Etiqueta Proyecto</label>
                                      <input type="text" placeholder="Ej: Boda Madrid" value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="w-full p-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>

                                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex justify-between items-center mt-2 shadow-sm">
                                   <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Total Operación (Con IVA)</span>
                                   <span className="text-sm font-black text-blue-600">
                                       {currentTotal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                                   </span>
                                </div>
                                
                                <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex justify-between items-center">
                                       <label className="text-[10px] font-black text-slate-600 uppercase">Estado Financiero</label>
                                       <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
                                          <button type="button" onClick={() => setEstadoPago(tipoTransaccion === 'gasto' ? 'PAGADO' : 'COBRADO')} className={`px-3 py-1.5 text-[10px] font-bold transition ${estadoPago !== 'PENDIENTE' ? (tipoTransaccion === 'gasto' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700') : 'text-slate-500 hover:bg-slate-50'}`}>
                                              {tipoTransaccion === 'gasto' ? 'PAGADO' : 'COBRADO'}
                                          </button>
                                          <button type="button" onClick={() => setEstadoPago('PENDIENTE')} className={`px-3 py-1.5 text-[10px] font-bold transition border-l border-slate-200 ${estadoPago === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                                              PENDIENTE
                                          </button>
                                       </div>
                                    </div>
                                    
                                    {tipoTransaccion === 'gasto' && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                                            <input type="checkbox" id="vehiculo" checked={isVehiculo} onChange={(e) => setIsVehiculo(e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500" />
                                            <label htmlFor="vehiculo" className="text-xs font-bold text-orange-800 cursor-pointer select-none">
                                                🚘 Gasto Vehículo (Deducir 50% IVA)
                                            </label>
                                        </div>
                                    )}
                                </div>

                              </>
                            ) : (
                              <div className="space-y-4 bg-purple-50/50 border border-purple-100 p-4 rounded-2xl">
                                 <div>
                                    <label className="block text-[10px] font-bold text-purple-900 uppercase mb-1">Nombre del Proyecto / Evento *</label>
                                    <input type="text" placeholder="Ej: Boda Madrid o Mantenimiento Web" value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="w-full p-2.5 bg-white border border-purple-200 text-slate-900 rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-purple-500/30 shadow-sm" />
                                 </div>
                                 
                                 <div>
                                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Cierre</label>
                                     <input type="date" value={mes} onChange={(e) => setMes(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-xs font-bold outline-none" />
                                 </div>

                                 <div className="border-t border-emerald-100 pt-3 mt-2">
                                     <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ingresos Asociados (Ventas, Propinas...)</span>
                                        <button type="button" onClick={() => setProyectoIngresos([...proyectoIngresos, { id: Date.now(), concepto: "", importe: "", categoria: categoriasIngreso[0] || "Ventas", iva: "21" }])} className="text-[9px] font-bold bg-white text-emerald-600 px-2 py-1.5 rounded-md border border-emerald-200 shadow-sm hover:bg-emerald-50">+ Ingreso</button>
                                     </div>
                                     <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {proyectoIngresos.map((ing, idx) => (
                                           <div key={ing.id} className="flex flex-col sm:flex-row gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 items-end">
                                              <div className="w-full sm:flex-1">
                                                 <input type="text" placeholder="Ej: Servicio principal" value={ing.concepto} onChange={(e) => setProyectoIngresos(proyectoIngresos.map(pi => pi.id === ing.id ? {...pi, concepto: e.target.value} : pi))} className="w-full p-1.5 border-b border-slate-200 text-slate-900 text-xs font-semibold outline-none bg-transparent" />
                                              </div>
                                              <div className="w-full sm:w-20">
                                                 <input type="text" inputMode="decimal" placeholder="€ Valor" value={ing.importe} onChange={(e) => setProyectoIngresos(proyectoIngresos.map(pi => pi.id === ing.id ? {...pi, importe: e.target.value} : pi))} className="w-full p-1.5 border-b border-slate-200 text-emerald-600 text-xs font-bold outline-none bg-transparent" />
                                              </div>
                                              <div className="w-full sm:w-16">
                                                 <select value={ing.iva} onChange={(e) => setProyectoIngresos(proyectoIngresos.map(pi => pi.id === ing.id ? {...pi, iva: e.target.value} : pi))} className="w-full p-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded text-[10px] outline-none">
                                                    <option value="21">21%</option><option value="10">10%</option><option value="4">4%</option><option value="0">0%</option>
                                                 </select>
                                              </div>
                                              <div className="w-full sm:w-24">
                                                 <select value={ing.categoria} onChange={(e) => setProyectoIngresos(proyectoIngresos.map(pi => pi.id === ing.id ? {...pi, categoria: e.target.value} : pi))} className="w-full p-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded text-[10px] outline-none">
                                                    {categoriasIngreso.map(c => <option key={c} value={c}>{c}</option>)}
                                                 </select>
                                              </div>
                                              <button type="button" onClick={() => setProyectoIngresos(proyectoIngresos.filter(pi => pi.id !== ing.id))} className="text-slate-400 hover:text-rose-500 p-1.5 mb-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                           </div>
                                        ))}
                                     </div>
                                 </div>

                                 <div className="border-t border-rose-100 pt-3 mt-2">
                                     <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Gastos Asociados (Compras, Nóminas...)</span>
                                        <button type="button" onClick={() => setProyectoGastos([...proyectoGastos, { id: Date.now(), concepto: "", importe: "", categoria: categoriasGasto[0] || "Logística", iva: "21" }])} className="text-[9px] font-bold bg-white text-rose-600 px-2 py-1.5 rounded-md border border-rose-200 shadow-sm hover:bg-rose-50">+ Coste</button>
                                     </div>
                                     <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {proyectoGastos.map((g, idx) => (
                                           <div key={g.id} className="flex flex-col sm:flex-row gap-2 bg-white p-2.5 rounded-xl border border-slate-200 items-end">
                                              <div className="w-full sm:flex-1">
                                                 <input type="text" placeholder="Ej: Alquiler furgoneta" value={g.concepto} onChange={(e) => setProyectoGastos(proyectoGastos.map(pg => pg.id === g.id ? {...pg, concepto: e.target.value} : pg))} className="w-full p-1.5 border-b border-slate-200 text-slate-900 text-xs font-semibold outline-none bg-transparent" />
                                              </div>
                                              <div className="w-full sm:w-20">
                                                 <input type="text" inputMode="decimal" placeholder="€ Coste" value={g.importe} onChange={(e) => setProyectoGastos(proyectoGastos.map(pg => pg.id === g.id ? {...pg, importe: e.target.value} : pg))} className="w-full p-1.5 border-b border-slate-200 text-rose-600 text-xs font-bold outline-none bg-transparent" />
                                              </div>
                                              <div className="w-full sm:w-16">
                                                 <select value={g.iva} onChange={(e) => setProyectoGastos(proyectoGastos.map(pg => pg.id === g.id ? {...pg, iva: e.target.value} : pg))} className="w-full p-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded text-[10px] outline-none">
                                                    <option value="21">21%</option><option value="10">10%</option><option value="4">4%</option><option value="0">0%</option>
                                                 </select>
                                              </div>
                                              <div className="w-full sm:w-24">
                                                 <select value={g.categoria} onChange={(e) => setProyectoGastos(proyectoGastos.map(pg => pg.id === g.id ? {...pg, categoria: e.target.value} : pg))} className="w-full p-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded text-[10px] outline-none">
                                                    {categoriasGasto.map(c => <option key={c} value={c}>{c}</option>)}
                                                 </select>
                                              </div>
                                              <button type="button" onClick={() => setProyectoGastos(proyectoGastos.filter(pg => pg.id !== g.id))} className="text-slate-400 hover:text-rose-500 p-1.5 mb-0.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                           </div>
                                        ))}
                                     </div>
                                 </div>
                                 
                                 <div className="bg-purple-100/50 p-4 rounded-xl border border-purple-200 flex justify-between items-center mt-2 shadow-sm">
                                     <div>
                                         <span className="text-[10px] font-black text-purple-900 uppercase block">Beneficio Limpio Esperado</span>
                                         <span className="text-[9px] text-purple-600 font-medium">Ingresos - Gastos asignados</span>
                                     </div>
                                     <div className="text-right">
                                         <span className={`text-xl font-black ${proyMargen >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                             {proyMargen >= 0 ? '+' : ''}{proyMargen.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                                         </span>
                                         <span className={`text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded border ${proyMargen >= 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                             {proyMargenPorcentaje.toFixed(1)}%
                                         </span>
                                     </div>
                                 </div>
                              </div>
                            )}

                            <button type="submit" disabled={isSaving} className={`w-full text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-2 transition shadow-sm ${tipoTransaccion === 'proyecto' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/30' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                {isSaving ? "Procesando..." : tipoTransaccion === 'proyecto' ? "Guardar Proyecto Completo" : "Asignar Movimiento"}
                            </button>
                          </form>
                        </div>
                    ) : (
                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                            <span className="text-5xl mb-4 animate-bounce">🛡️</span>
                            <h3 className="text-lg font-black text-indigo-900 mb-2">Candado de Seguridad Activo</h3>
                            <p className="text-sm text-indigo-700 font-medium max-w-sm mb-6">
                                El propietario de <span className="font-black">"{nombreEmpresaVisual}"</span> ha bloqueado la edición de datos. Solo puedes generar reportes y descargar libros contables.
                            </p>
                            <button onClick={exportarAExcel} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">
                                ↓ Descargar Libro Mayor (.csv)
                            </button>
                        </div>
                    )}
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
                    <p className="text-[11px] text-slate-400 font-medium mb-4">Gráficas libres de presupuestos (solo ingresos y gastos reales).</p>
                    <div className="flex-1 min-h-[220px]">
                      {isLoadingData ? (
                        <div className="h-full flex items-end justify-between gap-3 px-2 pb-4">
                          {[40, 70, 45, 90, 60, 75, 50].map((h, i) => (
                            <Skeleton key={i} className="w-full rounded-t-lg" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      ) : isMounted && chartData.length > 0 ? (
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
                  <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between lg:items-center bg-white z-10 gap-4">
                    <div className="flex items-center gap-3">
                       <h3 className="text-md font-bold text-slate-900">Libro Mayor Integrado</h3>
                       <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black px-2 py-0.5 rounded-full">{isLoadingData ? '...' : datosTablaFiltrados.length} registros</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                       <input 
                          type="text" 
                          placeholder="🔍 Buscar categoría, número, importe o NIF..." 
                          value={searchTerm}
                          onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                          className="w-full sm:flex-1 sm:w-80 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                       />
                       <div className="flex gap-2 w-full sm:w-auto">
                           <button onClick={exportarAExcel} className="flex-1 sm:flex-none flex justify-center items-center gap-2 text-xs font-bold bg-slate-50 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 shadow-sm transition whitespace-nowrap">
                             ↓ CSV
                           </button>
                           {isMounted && (
                               <LibroMayorPDFButton
                                   datos={datosTablaFiltrados}
                                   empresaId={empresaId}
                                   filtro={etiquetasFiltro[filtro] || 'Todas las Fechas'}
                                   fileName={`LibroMayor_${nombreEmpresaVisual.replace(/\s+/g, '')}_${filtroDoc}.pdf`}
                               />
                           )}
                       </div>
                    </div>
                  </div>
                  
                  <div className="px-4 md:px-6 pt-4 pb-2 bg-slate-50/50 border-b border-slate-100 flex flex-col">
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                         <button onClick={() => {setFiltroDoc('all'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroDoc === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todas las Op.</button>
                         <button onClick={() => {setFiltroDoc('ingresos'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroDoc === 'ingresos' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'}`}>Ingresos Reales</button>
                         <button onClick={() => {setFiltroDoc('gastos'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroDoc === 'gastos' ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600'}`}>Gastos / Compras</button>
                         <button onClick={() => {setFiltroDoc('pendientes'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroDoc === 'pendientes' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600'}`}>⏳ Pendientes</button>
                         
                         <button onClick={() => {setFiltroDoc('proyectos'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroDoc === 'proyectos' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-purple-50 hover:text-purple-600'}`}>🎯 Modo Proyectos</button>
                         <button onClick={() => {setFiltroDoc('presupuestos'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroDoc === 'presupuestos' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}>Presupuestos</button>
                      </div>

                      {filtroDoc === 'proyectos' && (
                         <div className="flex flex-col sm:flex-row gap-3 mt-3 p-3 bg-purple-50/50 border border-purple-100 rounded-xl animate-fade-in-up">
                             <select value={proyectoSeleccionadoFiltro} onChange={(e) => {setProyectoSeleccionadoFiltro(e.target.value); setCurrentPage(1);}} className="p-2 bg-white border border-purple-200 rounded-lg text-[10px] font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500/20">
                                 <option value="todos">📋 Todos los Proyectos</option>
                                 {proyectosUnicos.map(p => <option key={p} value={p}>🎯 {p}</option>)}
                             </select>

                             <div className="flex bg-white rounded-lg border border-purple-200 overflow-hidden">
                                 <button onClick={() => {setSubFiltroProyecto('all'); setCurrentPage(1);}} className={`px-4 py-2 text-[10px] font-bold transition ${subFiltroProyecto === 'all' ? 'bg-purple-100 text-purple-800' : 'text-slate-500 hover:bg-slate-50'}`}>Balance Completo</button>
                                 <button onClick={() => {setSubFiltroProyecto('ingresos'); setCurrentPage(1);}} className={`px-4 py-2 text-[10px] font-bold transition border-l border-r border-purple-100 ${subFiltroProyecto === 'ingresos' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>Solo Ingresos</button>
                                 <button onClick={() => {setSubFiltroProyecto('gastos'); setCurrentPage(1);}} className={`px-4 py-2 text-[10px] font-bold transition ${subFiltroProyecto === 'gastos' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}>Solo Gastos</button>
                             </div>
                         </div>
                      )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left whitespace-nowrap">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-20">
                        <tr>
                          <th className="px-4 md:px-6 py-3"><EncabezadoOrdenable label="Fecha" columnKey="fecha" /></th>
                          <th className="px-4 md:px-6 py-3"><EncabezadoOrdenable label="Categoría / Doc" columnKey="categoria" /></th>
                          <th className="px-4 md:px-6 py-3"><EncabezadoOrdenable label="Base Imponible" columnKey="importe" /></th>
                          <th className="px-4 md:px-6 py-3">Impuestos</th>
                          <th className="px-4 md:px-6 py-3">Total Final</th>
                          {/* 🚀 CANDADO MODO ASESOR: Oculta la columna Acciones si es lectura */}
                          {rolUsuario !== 'LECTURA' && <th className="px-4 md:px-6 py-3 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                        {isLoadingData && Array.from({ length: 6 }).map((_, i) => (
                          <tr key={`skeleton-${i}`}>
                            <td className="px-4 md:px-6 py-3.5"><Skeleton className="h-4 w-16" /></td>
                            <td className="px-4 md:px-6 py-3.5"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-4 md:px-6 py-3.5"><Skeleton className="h-4 w-20" /></td>
                            <td className="px-4 md:px-6 py-3.5"><Skeleton className="h-4 w-16" /></td>
                            <td className="px-4 md:px-6 py-3.5"><Skeleton className="h-4 w-20" /></td>
                            {rolUsuario !== 'LECTURA' && <td className="px-4 md:px-6 py-3.5"><Skeleton className="h-4 w-12 ml-auto" /></td>}
                          </tr>
                        ))}
                        {!isLoadingData && currentItems.map((item: any, index: number) => {
                          const isPresupuesto = item.categoria === 'Presupuestos' || item.numero_factura?.startsWith('P-');
                          const isAbono = item.numero_factura?.startsWith('R-');
                          const isIngreso = Number(item.total) > 0 && !isPresupuesto;
                          const isGasto = Number(item.total) < 0 && !isPresupuesto && !isAbono;
                          
                          let colorText = isPresupuesto ? 'text-amber-600' : (isAbono || isGasto ? 'text-rose-600' : 'text-emerald-600');
                          let bgBadge = isPresupuesto ? 'bg-amber-100 text-amber-700' : (isAbono ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600');
                          let tagLabel = isPresupuesto ? 'PRESUPUESTO' : (isAbono ? 'ABONO' : (item.categoria || 'General'));

                          const baseNum = Math.abs(Number(item.total));
                          const ivaPorcentaje = Number(item.iva) || 0;
                          const cuotaIva = baseNum * (ivaPorcentaje / 100);
                          const totalFinal = baseNum + cuotaIva;
                          const signoVisual = isPresupuesto ? '+' : (isGasto || isAbono ? '-' : '+');

                          const tagProyectoMatch = item.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
                          const proyectoEtiqueta = tagProyectoMatch ? tagProyectoMatch[1] : null;
                          
                          let estadoLabelDB = item.estado_pago || 'PAGADO';
                          const estadoFinal = estadoLabelDB === 'PENDIENTE' ? 'PENDIENTE' : (isIngreso ? 'COBRADO' : 'PAGADO');
                          const estadoColor = estadoFinal === 'PENDIENTE' ? 'text-amber-600 bg-amber-50 border-amber-200' : 
                                            (estadoFinal === 'COBRADO' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-blue-600 bg-blue-50 border-blue-200');

                          if (editingId === item.id) {
                            return (
                              <tr key={`edit-${item.id}`} className="bg-blue-50/30 transition">
                                <td className="px-4 py-2 align-top">
                                   <input type="date" value={editFormData.mes} onChange={(e) => setEditFormData({...editFormData, mes: e.target.value})} className={`w-full p-1.5 border rounded text-xs outline-none ${editFormErrors.mes ? 'border-rose-400 bg-rose-50' : 'border-blue-300'}`} />
                                   {editFormErrors.mes && <p className="text-[10px] font-bold text-rose-500 mt-1">{editFormErrors.mes}</p>}
                                </td>
                                <td className="px-4 py-2 flex gap-1 align-top">
                                   <select value={editFormData.categoria} onChange={(e) => setEditFormData({...editFormData, categoria: e.target.value})} className="w-1/2 p-1.5 border border-blue-300 rounded text-xs outline-none mb-1">
                                     {(editFormData.tipo === 'ingreso' ? categoriasIngreso : categoriasGasto).map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                                   <select value={editFormData.estado_pago} onChange={(e) => setEditFormData({...editFormData, estado_pago: e.target.value})} className="w-1/2 p-1.5 border border-blue-300 rounded text-xs outline-none mb-1 font-bold">
                                      <option value={editFormData.tipo === 'ingreso' ? 'COBRADO' : 'PAGADO'}>{editFormData.tipo === 'ingreso' ? 'COBRADO' : 'PAGADO'}</option>
                                      <option value="PENDIENTE">PENDIENTE</option>
                                   </select>
                                </td>
                                <td className="px-4 py-2 align-top">
                                   <input type="text" inputMode="decimal" value={editFormData.ingreso} onChange={(e) => setEditFormData({...editFormData, ingreso: e.target.value})} className={`w-full w-24 p-1.5 border rounded text-xs outline-none ${editFormErrors.ingreso ? 'border-rose-400 bg-rose-50' : 'border-blue-300'}`} />
                                   {editFormErrors.ingreso && <p className="text-[10px] font-bold text-rose-500 mt-1 whitespace-normal">{editFormErrors.ingreso}</p>}
                                </td>
                                <td className="px-4 py-2">
                                   <select value={editFormData.ivaSeleccionado} onChange={(e) => setEditFormData({...editFormData, ivaSeleccionado: e.target.value})} className="w-full p-1.5 border border-blue-300 rounded text-xs outline-none">
                                      <option value="21">21%</option><option value="10">10%</option><option value="4">4%</option><option value="0">0%</option>
                                   </select>
                                </td>
                                <td className="px-4 py-2 text-slate-400 text-xs italic">Auto</td>
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
                              <td className="px-4 md:px-6 py-3.5 flex flex-col gap-1 items-start">
                                <div className="flex items-center gap-1">
                                    <span className={`${bgBadge} px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-white/20`}>
                                       {tagLabel}
                                    </span>
                                    {proyectoEtiqueta && (
                                        <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" title="Asignado a Proyecto">
                                            🎯 {proyectoEtiqueta}
                                        </span>
                                    )}
                                </div>
                                
                                {(item.numero_factura || item.cif) && (
                                    <span className="text-[10px] font-bold text-slate-400">{item.cif ? `${item.cif} | ` : ''}{item.numero_factura}</span>
                                )}
                                <div className="flex gap-1 mt-0.5">
                                    {item.isRecurrent && (
                                      <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center" title={`Gasto fijo: ${item.frecuencia}`}>
                                        🔄 {item.frecuencia}
                                      </span>
                                    )}
                                    {item.concepto_detalle && item.concepto_detalle.includes("Vehículo") && (
                                        <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200" title="Solo 50% del IVA deducido por ley">
                                            🚘 50%
                                        </span>
                                    )}
                                    {item.url_archivo && (
                                        <a href={item.url_archivo} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition flex items-center" title="Ver documento adjunto">
                                            📎 Doc
                                        </a>
                                    )}
                                </div>
                              </td>
                              
                              <td className="px-4 md:px-6 py-3.5 font-bold text-slate-700">
                                 {baseNum.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                              </td>
                              <td className="px-4 md:px-6 py-3.5">
                                 <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 block w-fit">
                                    {ivaPorcentaje === 0 ? "Exento" : `+${cuotaIva.toLocaleString('es-ES', {minimumFractionDigits: 2})} € (${ivaPorcentaje}%)`}
                                 </span>
                              </td>
                              <td className={`px-4 md:px-6 py-3.5 font-black text-base ${colorText}`}>
                                 {signoVisual}{totalFinal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                              </td>

                              {/* 🚀 CANDADO MODO ASESOR: Oculta los botones de edición si es lectura */}
                              {rolUsuario !== 'LECTURA' && (
                                  <td className="px-4 md:px-6 py-3.5 text-right flex justify-end gap-2 items-center">
                                    {!isPresupuesto && !isAbono && (
                                        <button onClick={() => marcarComoPagado(item.id)} className={`text-[9px] font-black px-2 py-1 rounded border ${estadoColor} hover:opacity-70 transition`} title="Cambiar estado de pago (Clic para alternar)">
                                            {estadoFinal}
                                        </button>
                                    )}
                                    {!isPresupuesto && !isAbono && (
                                        <button onClick={() => iniciarEdicion(item)} className="text-blue-400 hover:text-blue-600 p-1 rounded-lg" title="Editar manual">
                                          <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    )}
                                    <button onClick={() => item.id && setDeleteTargetId(item.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-lg" title="Eliminar registro">
                                      <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </td>
                              )}
                            </tr>
                          );
                        })}
                        {!isLoadingData && datosTablaFiltrados.length === 0 && (
                          <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-slate-400">No se encontraron registros para esta búsqueda o filtro.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
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
             </>
            )}
            <div className="h-24 md:h-10"></div>
          </main>
        </div>

        <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 flex flex-col items-end" translate="no">
          {isChatOpen && (
            <div className="mb-4 w-[calc(100vw-3rem)] max-w-sm h-[400px] md:h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in-up">
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <h4 className="text-sm font-bold">CFO Virtual - {nombreEmpresaVisual}</h4>
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
                  maxLength={4000}
                  placeholder="Pregunta a tu CFO..." 
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="submit" disabled={isChatLoading || !currentMessage.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                  <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V6m0 0l-4 4m4-4l4 4" /></svg>
                </button>
              </form>
            </div>
          )}

          <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform z-50">
            {isChatOpen ? (
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
              </svg>
            )}
          </button>
        </div>

        {/* 🚀 MODAL MODO ASESOR */}
        {showAsesorModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col" translate="no">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">👥 Modo Asesor</h3>
                        <button onClick={() => setShowAsesorModal(false)} className="text-slate-400 hover:text-rose-500 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-blue-800 mb-1">Invita a tu Gestor Fiscal</h4>
                            <p className="text-xs text-blue-600 font-medium mb-4">Tu asesor podrá entrar a TaxGuard con su email, ver tus números y descargar el Libro Mayor para generar los impuestos, <strong className="font-black">pero no podrá borrar ni editar facturas.</strong></p>
                            
                            <form onSubmit={manejarInvitarAsesor} className="flex gap-2">
                                <input 
                                    type="email" 
                                    required
                                    value={asesorEmail} 
                                    onChange={(e) => setAsesorEmail(e.target.value)} 
                                    placeholder="email@gestoria.com" 
                                    className="flex-1 p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" 
                                />
                                <button type="submit" disabled={isInviting} className="bg-blue-600 text-white font-bold px-4 py-2.5 rounded-lg hover:bg-blue-500 transition disabled:opacity-50">
                                    {isInviting ? "..." : "Invitar"}
                                </button>
                            </form>
                        </div>

                        {listaAsesores.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <h4 className="text-sm font-bold text-slate-800 mb-3">Asesores con Acceso a {nombreEmpresaVisual}</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {listaAsesores.map((asesor) => (
                                        <div key={asesor.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900">{asesor.asesorEmail}</span>
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Rol: {asesor.rol}</span>
                                            </div>
                                            <button onClick={() => manejarRevocarAsesor(asesor.id)} className="text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-100 transition">
                                                Revocar Acceso
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* 🚀 MODAL CONFIGURACIÓN AMPLIADO B2B */}
        {showConfig && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" translate="no">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <h3 className="text-lg font-black text-slate-900">Ajustes: {nombreEmpresaVisual}</h3>
                  <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-rose-500 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-white flex flex-col lg:flex-row gap-6">
                  
                  {/* Columna Izquierda: Perfil y Categorías */}
                  <div className="flex-1 space-y-6">
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                          <h4 className="text-sm font-bold text-blue-800 mb-1">Perfil de Inteligencia Artificial</h4>
                          <p className="text-[10px] text-blue-600 font-medium mb-3">Estos datos enseñan al CFO Virtual a entender tu modelo de negocio.</p>
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
                          <p className="text-[10px] text-slate-500 font-medium mb-3">Separadas por comas. El Escáner OCR aprenderá a usarlas automáticamente.</p>
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

                  {/* Columna Derecha: Datos Fiscales y Papelera */}
                  <div className="flex-1 space-y-6">
                      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                          <h4 className="text-sm font-bold text-purple-800 mb-1">Datos de Facturación Fiscal</h4>
                          <p className="text-[10px] text-purple-600 font-medium mb-3">Información legal de la empresa. Se usará para autocompletar la emisión de PDFs oficiales en futuras actualizaciones.</p>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">Nombre Legal / Razón Social</label>
                              <input type="text" value={datosFiscales.razonSocial} onChange={(e) => setDatosFiscales({...datosFiscales, razonSocial: e.target.value})} placeholder="Ej: NexaCorp S.L." className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">NIF / CIF</label>
                              <input type="text" value={datosFiscales.nif} onChange={(e) => setDatosFiscales({...datosFiscales, nif: e.target.value})} placeholder="Ej: B12345678" className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">Dirección Fiscal Completa</label>
                              <textarea value={datosFiscales.direccion} onChange={(e) => setDatosFiscales({...datosFiscales, direccion: e.target.value})} placeholder="Ej: Calle Principal 123, 28001 Madrid" rows={2} className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
                            </div>
                          </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                          <h4 className="text-sm font-bold text-slate-800 mb-1">Tus Espacios de Trabajo</h4>
                          <p className="text-[10px] text-slate-500 font-medium mb-3">Borrar un espacio lo mueve a la papelera durante 7 días antes de eliminarlo para siempre.</p>
                          <div className="space-y-2">
                             {empresas.map(e => (
                               <div key={e} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200">
                                  <span className="text-xs font-bold text-slate-700 truncate mr-2">{e}</span>
                                  <button
                                    onClick={() => setEmpresaAEliminar(e)}
                                    disabled={empresas.length <= 1}
                                    title={empresas.length <= 1 ? "No puedes borrar tu único espacio de trabajo" : "Borrar este espacio"}
                                    className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                                  >
                                    🗑️ Borrar
                                  </button>
                               </div>
                             ))}
                          </div>
                      </div>

                      {papelera.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-rose-800 mb-1 flex items-center gap-2">
                                🗑️ Papelera de Reciclaje
                            </h4>
                            <p className="text-[10px] text-rose-600 font-medium mb-3">Estos espacios fueron borrados recientemente.</p>
                            <div className="space-y-2">
                               {papelera.map((item, idx) => (
                                 <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-rose-100">
                                   <span className="text-[10px] font-bold text-slate-700 truncate mr-2">{item.nombre}</span>
                                   <button onClick={() => recuperarDePapelera(item.nombre)} className="text-[9px] font-bold bg-rose-600 text-white px-2 py-1 rounded-md hover:bg-rose-700 shrink-0">Restaurar</button>
                                 </div>
                               ))}
                            </div>
                        </div>
                      )}
                  </div>

                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                  <button onClick={guardarPerfil} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-md transition">
                    Guardar Configuración
                  </button>
                </div>
             </div>
          </div>
        )}

      </Show>

      {/* RUTA DE ESCAPE PÚBLICA TOTALMENTE RENOVADA */}
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
                  <button className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white transition cursor-pointer">Iniciar Sesión</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition backdrop-blur-sm border border-white/5 shadow-sm cursor-pointer">Crear Cuenta</button>
                </SignUpButton>
              </div>
            </div>
          </nav>

          {/* HERO SECTION MEJORADO B2B */}
          <div className="relative pt-32 lg:pt-48 overflow-hidden border-b border-white/5 pb-20">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
             
             <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> SaaS Financiero B2B
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8 max-w-4xl mx-auto">
                  Tu empresa merece un Director Financiero. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">La IA te lo da por 89€.</span>
                </h1>
                <p className="text-lg lg:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                  Automatiza tu contabilidad, escanea tickets en segundos, controla quién te debe dinero y genera todos tus impuestos oficiales (303, 130, 390, 115, 347, 349) sin depender de terceros.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                  <SignUpButton mode="modal">
                    <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-base font-bold transition shadow-xl shadow-blue-500/20 border border-blue-400/20 flex items-center justify-center gap-2 cursor-pointer">
                      Crear Cuenta Gratis <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                  </SignUpButton>
                </div>

                {/* TRUST BADGES */}
                <div className="mt-12 mb-8 hidden md:block">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Con la confianza de empresas modernas</p>
                   <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 opacity-40 grayscale">
                      <span className="text-lg font-black flex items-center gap-1"><span className="text-blue-500">◆</span> NexaCorp</span>
                      <span className="text-lg font-black flex items-center gap-1"><span className="text-emerald-500">▲</span> VertexSL</span>
                      <span className="text-lg font-black flex items-center gap-1"><span className="text-rose-500">●</span> Kroma.io</span>
                      <span className="text-lg font-black flex items-center gap-1"><span className="text-amber-500">■</span> Zenith</span>
                   </div>
                </div>

                {/* CSS DASHBOARD MOCKUP */}
                <div className="relative mx-auto max-w-5xl mt-16 perspective-1000 hidden md:block">
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950 z-20 pointer-events-none"></div>
                   <div className="rounded-t-2xl border border-slate-800 bg-slate-900/50 p-2 shadow-2xl backdrop-blur-md overflow-hidden" style={{ transform: 'perspective(1000px) rotateX(10deg) scale(0.95)', transformOrigin: 'bottom' }}>
                      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 sm:p-6 h-[400px] flex flex-col gap-4">
                         <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <div className="w-32 h-6 bg-slate-800 rounded-md"></div>
                            <div className="w-10 h-10 bg-slate-800 rounded-full"></div>
                         </div>
                         <div className="grid grid-cols-3 gap-4">
                            <div className="h-24 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex flex-col justify-center">
                               <div className="w-16 h-3 bg-slate-700 rounded-md mb-3"></div>
                               <div className="w-24 h-6 bg-emerald-500/20 rounded-md"></div>
                            </div>
                            <div className="h-24 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex flex-col justify-center">
                               <div className="w-16 h-3 bg-slate-700 rounded-md mb-3"></div>
                               <div className="w-24 h-6 bg-rose-500/20 rounded-md"></div>
                            </div>
                            <div className="h-24 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex flex-col justify-center">
                               <div className="w-16 h-3 bg-slate-700 rounded-md mb-3"></div>
                               <div className="w-24 h-6 bg-blue-500/20 rounded-md"></div>
                            </div>
                         </div>
                         <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 flex items-end p-4 gap-2">
                            <div className="w-full bg-emerald-500/20 rounded-t-md h-[40%]"></div>
                            <div className="w-full bg-emerald-500/40 rounded-t-md h-[60%]"></div>
                            <div className="w-full bg-rose-500/20 rounded-t-md h-[30%]"></div>
                            <div className="w-full bg-emerald-500/60 rounded-t-md h-[80%]"></div>
                            <div className="w-full bg-emerald-500/80 rounded-t-md h-[100%]"></div>
                         </div>
                      </div>
                   </div>
                </div>

             </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 border-b border-white/5">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">¿Cómo TaxGuard AI multiplica tu rentabilidad?</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Seis pilares diseñados para eliminar el error humano y maximizar tu tiempo operativo.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 transition hover:border-slate-600">
                <div className="w-14 h-14 bg-blue-500/20 text-blue-400 flex items-center justify-center rounded-2xl text-xl mb-6">📸</div>
                <h3 className="text-lg font-bold text-white mb-3">Escáner OCR Inteligente</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Convierte montañas de tickets en asientos contables con una simple foto. La IA lee el IVA, la base y clasifica el gasto al instante.</p>
              </div>
              
              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 transition hover:border-slate-600">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-2xl text-xl mb-6">📊</div>
                <h3 className="text-lg font-bold text-white mb-3">Rentabilidad por Eventos</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Etiqueta tus ingresos y gastos para saber exactamente cuánto dinero limpio te deja cada proyecto, servicio o evento individual.</p>
              </div>
              
              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 transition hover:border-slate-600">
                <div className="w-14 h-14 bg-rose-500/20 text-rose-400 flex items-center justify-center rounded-2xl text-xl mb-6">🚨</div>
                <h3 className="text-lg font-bold text-white mb-3">Radar de Morosidad</h3>
                <p className="text-slate-400 text-sm leading-relaxed">No dejes que jueguen con tu dinero. Control automático de facturas vencidas (+30 días) y alertas de liquidez pendiente de cobro.</p>
              </div>

              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 transition hover:border-slate-600">
                <div className="w-14 h-14 bg-purple-500/20 text-purple-400 flex items-center justify-center rounded-2xl text-xl mb-6">🏛️</div>
                <h3 className="text-lg font-bold text-white mb-3">Fiscalidad Total</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Olvídate del miedo a Hacienda. Generamos los modelos 303, 130, 390, 115, 347 y 349 listos para calcar en la Agencia Tributaria.</p>
              </div>

              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 transition hover:border-slate-600">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-400 flex items-center justify-center rounded-2xl text-xl mb-6">🪄</div>
                <h3 className="text-lg font-bold text-white mb-3">Facturación B2B</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Crea facturas con tu logo, emite presupuestos elegantes y conviértelos a oficiales con un solo clic. Control total de tu flujo de caja.</p>
              </div>

              <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 transition hover:border-slate-600">
                <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-2xl text-xl mb-6">🧠</div>
                <h3 className="text-lg font-bold text-white mb-3">CFO Virtual AI</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Un auditor de IA que detecta fugas de capital, analiza tus márgenes operativos y te avisa de problemas antes de que ocurran.</p>
              </div>

            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 border-b border-white/5">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">La Inversión que se paga sola</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                No contrates un software. Contrata tiempo. TaxGuard AI está diseñado para ahorrarte más de <span className="text-blue-400 font-bold">30 horas al mes</span> en gestión administrativa y cientos de euros en errores fiscales.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
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
                     <span className="text-slate-300 text-sm font-medium">Escáner OCR Ilimitado con IA (Sube tickets y olvídate).</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Modelos Trimestrales (303 IVA y 130 IRPF) listos para la AEAT.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Creador de Facturas PDF y Presupuestos con tu logo.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-emerald-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium">Libro Mayor Excel/PDF y 'Escudo 50%' para vehículos.</span>
                   </li>
                </ul>
                <SignUpButton mode="modal">
                  <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl border border-slate-700 transition flex flex-col items-center cursor-pointer">
                    <span>Empezar 7 días gratis</span>
                    <span className="text-[10px] font-medium text-slate-400 font-normal mt-0.5">Cancela cuando quieras</span>
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
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Gestión Fiscal Total:</strong> Modelos 303, 130, 390, 115, 347 y 349 automáticos.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Visión de Caja Libre:</strong> Separación inteligente del beneficio real y la provisión intocable de Hacienda.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Rentabilidad por Proyecto/Evento:</strong> Etiqueta ingresos y gastos para conocer tu margen exacto.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="text-blue-400 mt-0.5">✓</span>
                     <span className="text-slate-300 text-sm font-medium"><strong className="text-white">Radar de Morosidad:</strong> Control de clientes impagados y facturas vencidas en tiempo real.</span>
                   </li>
                </ul>
                <SignUpButton mode="modal">
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl border border-blue-400/20 shadow-xl shadow-blue-500/20 transition flex flex-col items-center cursor-pointer">
                    <span>Probar PRO 7 días gratis</span>
                    <span className="text-[10px] text-blue-200 font-normal mt-0.5">Sin compromiso de permanencia</span>
                  </button>
                </SignUpButton>
              </div>

            </div>
          </div>

          <div className="max-w-3xl mx-auto px-6 py-24 relative z-10">
             <h3 className="text-3xl font-black text-white text-center mb-10">Dudas antes de empezar</h3>
             
             <div className="space-y-4">
                
                <details className="group bg-slate-900/30 p-6 rounded-2xl border border-slate-800 open:border-slate-600 transition-colors cursor-pointer">
                   <summary className="flex justify-between items-center font-bold text-white text-sm list-none outline-none">
                      ¿Mis datos y facturas están seguros?
                      <span className="transition group-open:rotate-180 text-blue-500">▼</span>
                   </summary>
                   <p className="text-slate-400 text-sm leading-relaxed mt-4">Máxima seguridad. TaxGuard AI utiliza bases de datos aisladas (Supabase) y cifradas de extremo a extremo. Nadie, ni siquiera nosotros, puede leer tus reportes financieros ni los datos de tus clientes.</p>
                </details>

                <details className="group bg-slate-900/30 p-6 rounded-2xl border border-slate-800 open:border-slate-600 transition-colors cursor-pointer">
                   <summary className="flex justify-between items-center font-bold text-white text-sm list-none outline-none">
                      ¿El borrador de impuestos me sirve para presentarlo de verdad?
                      <span className="transition group-open:rotate-180 text-blue-500">▼</span>
                   </summary>
                   <p className="text-slate-400 text-sm leading-relaxed mt-4">Sí. Nuestros PDFs generan exactamente las mismas casillas numeradas que la Agencia Tributaria. Solo tienes que abrir su Sede Electrónica, buscar el modelo correspondiente, y copiar los valores en dos minutos. Sin gestores, sin esperas.</p>
                </details>

                <details className="group bg-slate-900/30 p-6 rounded-2xl border border-slate-800 open:border-slate-600 transition-colors cursor-pointer">
                   <summary className="flex justify-between items-center font-bold text-white text-sm list-none outline-none">
                      ¿Cómo funciona la Rentabilidad por Proyecto o Eventos?
                      <span className="transition group-open:rotate-180 text-blue-500">▼</span>
                   </summary>
                   <p className="text-slate-400 text-sm leading-relaxed mt-4">Es una función exclusiva del Plan Pro. Por ejemplo, si alquilas material para eventos o haces una consultoría, puedes etiquetar todos los gastos (gasolina, personal, compras) y la factura de cobro bajo el nombre "Evento Madrid". El Centro de Inteligencia calculará automáticamente el porcentaje de beneficio limpio de esa operación.</p>
                </details>

                <details className="group bg-slate-900/30 p-6 rounded-2xl border border-slate-800 open:border-slate-600 transition-colors cursor-pointer">
                   <summary className="flex justify-between items-center font-bold text-white text-sm list-none outline-none">
                      ¿Qué pasa si un cliente no me paga a tiempo?
                      <span className="transition group-open:rotate-180 text-blue-500">▼</span>
                   </summary>
                   <p className="text-slate-400 text-sm leading-relaxed mt-4">El Radar de Morosidad (Plan Pro) vigila tus facturas emitidas. Si pasan 30 días sin que marques la factura como "Cobrada", el sistema la marcará en rojo como "Vencida" y sumará el importe a tu panel de riesgo para que sepas exactamente quién te debe dinero.</p>
                </details>

                <details className="group bg-slate-900/30 p-6 rounded-2xl border border-slate-800 open:border-slate-600 transition-colors cursor-pointer">
                   <summary className="flex justify-between items-center font-bold text-white text-sm list-none outline-none">
                      ¿Puedo cambiar del Plan Autónomo al Pro más adelante?
                      <span className="transition group-open:rotate-180 text-blue-500">▼</span>
                   </summary>
                   <p className="text-slate-400 text-sm leading-relaxed mt-4">Por supuesto. Puedes hacer el upgrade desde tu panel en cualquier momento. Nuestro sistema calculará automáticamente la diferencia prorrateada (solo pagarás la parte proporcional del mes que queda).</p>
                </details>

             </div>
          </div>

          <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm relative z-10 bg-slate-950">
            <p>© {new Date().getFullYear()} TaxGuard AI. Todos los derechos reservados.</p>
            <p className="mt-2">Plataforma SaaS de alto rendimiento para PYMEs y Autónomos.</p>
            <p className="mt-6 text-xs text-slate-600">Contacto comercial y soporte: soporte.taxguard@gmail.com</p>
          </footer>
        </div>
      </Show>
    </>
  );
}