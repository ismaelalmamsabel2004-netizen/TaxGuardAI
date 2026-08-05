"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useUser, UserButton, Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
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

import {
  obtenerDatosSupabase, guardarDatoSupabase, editarDatoSupabase, borrarDatoSupabase,
  obtenerContactosCRM, guardarContactoCRM, editarContactoCRM, borrarContactoCRM, migrarContactosCRMDesdeJSON,
  obtenerEmpresasCliente, verificarRolUsuario, obtenerPerfilEspacio,
} from '../actions';
import { contactoCrmSchema, mapearErroresZod, nifCifOpcional } from '../../lib/validations';
import { obtenerAjustesSilencioso, obtenerAjustes, guardarAjustes } from '../../lib/settingsClient';
import EspacioTrabajoSelect from '../../components/EspacioTrabajoSelect';
import BannerModoAsesor from '../../components/BannerModoAsesor';
import {
  esEspacioCliente,
  guardarEspacioSesion,
  limpiarEspacioSesion,
  resolverEspacioInicial,
  nombreEspacioVisible,
} from '../../lib/workspaceSession';

// 🚀 RENDIMIENTO: @react-pdf/renderer se carga en su propio chunk, solo en el navegador y solo
// cuando cada botón llega a pintarse, para no lastrar el JS inicial de la página de Facturación.
const FacturaPDFButtonPrincipal = dynamic(() => import('../../components/pdf/FacturaPDFButton'), {
  ssr: false,
  loading: () => <button disabled className="w-full text-white/60 font-black py-4 rounded-xl bg-slate-700 flex items-center justify-center gap-2">⏳ Preparando PDF...</button>
});
const FacturaPDFButtonHistorico = dynamic(() => import('../../components/pdf/FacturaPDFButton'), {
  ssr: false,
  loading: () => <button disabled className="text-slate-300 bg-slate-50 p-1.5 rounded-md border border-slate-200" title="Cargando..."><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
});

export default function GeneradorFacturas() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [allSettings, setAllSettings] = useState<any>({});
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [espaciosCliente, setEspaciosCliente] = useState<any[]>([]);
  const [rolUsuario, setRolUsuario] = useState('LOADING');
  
  const [modoActivo, setModoActivo] = useState<"factura" | "presupuesto">("factura");
  const [filtroHistorial, setFiltroHistorial] = useState<"todas" | "facturas" | "presupuestos" | "rectificativas">("todas");
  
  const [numeroFactura, setNumeroFactura] = useState(`F-${new Date().getFullYear()}-001`);
  const [numeroPresupuesto, setNumeroPresupuesto] = useState(`P-${new Date().getFullYear()}-001`);
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  
  const [miNif, setMiNif] = useState("");
  const [miDireccion, setMiDireccion] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [iban, setIban] = useState("");
  
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  
  const [lineasFactura, setLineasFactura] = useState([{ id: Date.now(), concepto: "", cantidad: 1, precio: 0 }]);
  
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");
  const [irpfSeleccionado, setIrpfSeleccionado] = useState("0");

  const [isSaving, setIsSaving] = useState(false);
  const [facturaGuardada, setFacturaGuardada] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [facturaBloqueada, setFacturaBloqueada] = useState(false);
  
  const [historialFacturas, setHistorialFacturas] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [editandoHistorialId, setEditandoHistorialId] = useState<number | null>(null);
  const [editClientData, setEditClientData] = useState({ nombre: "", nif: "" });

  const [planActivo, setPlanActivo] = useState('loading');

  const [clientesCRM, setClientesCRM] = useState<{id: number, nombre: string, nif: string, direccion: string, email?: string, telefono?: string}[]>([]);
  const [showCRM, setShowCRM] = useState(false);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [editandoClienteId, setEditandoClienteId] = useState<number | null>(null);
  const [editCRMData, setEditCRMData] = useState({ nombre: "", nif: "", direccion: "", email: "", telefono: "" });

  const [showNuevoCliente, setShowNuevoCliente] = useState(false);

  // 🛡️ BLINDAJE DE DATOS: errores de validación del CRM + confirmaciones destructivas premium
  const [crmErrors, setCrmErrors] = useState<Record<string, string>>({});
  const [crmEditErrors, setCrmEditErrors] = useState<Record<string, string>>({});
  const [facturaErrors, setFacturaErrors] = useState<Record<string, string>>({});
  // 🚀 UX PREMIUM: evita pantallas en blanco/parpadeos en el historial mientras llegan los datos
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(true);
  const [crmIdToDelete, setCrmIdToDelete] = useState<number | null>(null);
  const [docIdToDelete, setDocIdToDelete] = useState<any | null>(null);
  const [facturaRectificativaPendiente, setFacturaRectificativaPendiente] = useState<any | null>(null);
  const [nuevoClienteData, setNuevoClienteData] = useState({ nombre: "", nif: "", direccion: "", email: "", telefono: "" });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 🚀 ESTADOS PARA EL MODAL DE SOPORTE VIP
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 🛡️ BLINDAJE DE ESTADO: ignora respuestas tardías si el usuario cambia de empresa muy rápido
  const empresaSolicitadaRef = useRef<string>("");

  const esLectura = rolUsuario === 'LECTURA';
  const puedeEscribir = !esLectura && !esEspacioCliente(empresaId);

  const aplicarDatosFacturacion = (config: any) => {
      if (config) {
          setMiNif(config.nif || "");
          setMiDireccion(config.direccion || "");
          setLogo(config.logo || null);
          setMetodoPago(config.metodoPago || "Transferencia");
          setIban(config.iban || "");
      } else {
          setMiNif(""); setMiDireccion(""); setLogo(null); setMetodoPago("Transferencia"); setIban("");
      }
  };

  const cargarDatosEmisorEspacio = async (id: string, settings?: any) => {
      if (esEspacioCliente(id)) {
          const perfilRemoto = await obtenerPerfilEspacio(id);
          if (empresaSolicitadaRef.current !== id) return;
          aplicarDatosFacturacion(perfilRemoto.success ? perfilRemoto.datosFacturacion : null);
          return;
      }
      const fuente = settings || allSettings;
      aplicarDatosFacturacion(fuente?.datosFacturacion?.[id] || null);
  };

  useEffect(() => {
    setIsMounted(true);
    
    if (!isLoaded) return;
    if (!isSignedIn) return;

    obtenerEmpresasCliente().then(setEspaciosCliente);

    obtenerAjustesSilencioso()
      .then(async (data: any) => {
         const planDetectado = data.planSuscripcion || 'free';
         if (planDetectado === 'free') { router.push('/precios'); return; }

         setPlanActivo(planDetectado);
         setAllSettings(data);
         const listaEmpresas = data.empresas || ["Alperez"];
         setEmpresas(listaEmpresas);
         const activa = resolverEspacioInicial(data.empresaActiva, listaEmpresas);
         empresaSolicitadaRef.current = activa;
         setEmpresaId(activa);
         if (esEspacioCliente(activa)) guardarEspacioSesion(activa);
         else limpiarEspacioSesion();

         await cargarDatosEmisorEspacio(activa, data);
         cargarContactosCRM(activa, data.crm?.[activa]);
      });
  }, [isLoaded, isSignedIn, router]);

  // 🚀 CRM REAL: carga los contactos desde la tabla ContactoEmpresa y, si es la primera vez
  // que este espacio se abre tras la migración, importa en silencio la agenda antigua guardada
  // en el JSON de ajustes para que el usuario no pierda ni un solo contacto.
  const cargarContactosCRM = async (empresa: string, contactosLegacyJSON?: any[]) => {
      if (!empresa) return setClientesCRM([]);
      let contactos = await obtenerContactosCRM(empresa);
      if (contactos.length === 0 && contactosLegacyJSON && contactosLegacyJSON.length > 0) {
          await migrarContactosCRMDesdeJSON(empresa, contactosLegacyJSON);
          contactos = await obtenerContactosCRM(empresa);
      }
      if (empresaSolicitadaRef.current !== empresa) return; // Respuesta obsoleta: ya se cambió de empresa
      setClientesCRM(contactos as any);
  };

  useEffect(() => {
    if (!empresaId) return;
    // Para espacios propios seguimos leyendo de allSettings; CLIENTE| se carga vía obtenerPerfilEspacio
    if (esEspacioCliente(empresaId)) return;
    aplicarDatosFacturacion(allSettings?.datosFacturacion?.[empresaId] || null);
  }, [empresaId, allSettings]);

  useEffect(() => {
    if (!empresaId) return;
    setRolUsuario('LOADING');
    verificarRolUsuario(empresaId).then((res) => {
      if (empresaSolicitadaRef.current === empresaId) setRolUsuario(res.rol);
    });
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    empresaSolicitadaRef.current = empresaId;
    setIsLoadingHistorial(true);
    obtenerDatosSupabase(empresaId).then(movimientos => {
         if (empresaSolicitadaRef.current !== empresaId) return; // Respuesta obsoleta: ya se cambió de empresa
         const anioActual = fecha.split('-')[0] || new Date().getFullYear().toString();
         
         const documentos = movimientos.filter((m: any) => m.numero_factura);
         setHistorialFacturas(documentos.sort((a,b) => b.id - a.id)); 
         setIsLoadingHistorial(false);

         if (!facturaBloqueada) {
            const facturasF = documentos.filter((m: any) => {
               const [, , y] = m.name.split('/');
               return y === anioActual && m.numero_factura?.startsWith('F-');
            });
            const presupuestosP = documentos.filter((m: any) => {
               const [, , y] = m.name.split('/');
               return y === anioActual && m.numero_factura?.startsWith('P-');
            });

            const siguienteF = facturasF.length + 1;
            const siguienteP = presupuestosP.length + 1;
            
            setNumeroFactura(`F-${anioActual}-${String(siguienteF).padStart(3, '0')}`);
            setNumeroPresupuesto(`P-${anioActual}-${String(siguienteP).padStart(3, '0')}`);
         }
    });
  }, [empresaId, fecha, refreshTrigger, facturaBloqueada]);

  // 🚀 FUNCIONES SOPORTE VIP Y GESTIÓN
  const cambiarEmpresa = async (nuevaEmpresa: string) => {
    empresaSolicitadaRef.current = nuevaEmpresa;
    setEmpresaId(nuevaEmpresa);
    setRolUsuario('LOADING');

    if (esEspacioCliente(nuevaEmpresa)) {
      guardarEspacioSesion(nuevaEmpresa);
      await cargarDatosEmisorEspacio(nuevaEmpresa);
      cargarContactosCRM(nuevaEmpresa);
      return;
    }

    limpiarEspacioSesion();
    const newSettings = { ...allSettings, empresaActiva: nuevaEmpresa };
    setAllSettings(newSettings);
    await cargarDatosEmisorEspacio(nuevaEmpresa, newSettings);
    cargarContactosCRM(nuevaEmpresa, newSettings.crm?.[nuevaEmpresa]);
    await guardarAjustes(newSettings);
  };

  const salirModoAsesor = async () => {
    limpiarEspacioSesion();
    const propia = empresas[0] || 'Alperez';
    await cambiarEmpresa(propia);
    toast.success('Modo Propietario', { description: 'Has vuelto a tu espacio personal.' });
  };

  const toastSoloLectura = () => {
    toast.error("Solo lectura", { description: "En Modo Asesor no puedes modificar los datos del cliente." });
  };

  const bloquearEscritura = () => {
    if (esLectura || esEspacioCliente(empresaId)) {
      toastSoloLectura();
      return true;
    }
    return false;
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
      toast.success("Copiado", { description: "Correo copiado al portapapeles." });
  };

  // 🚀 RENDIMIENTO: el logo se guarda dentro del mismo JSON de ajustes que TODAS las páginas de la
  // app descargan en cada carga. Sin comprimirlo, una foto sin optimizar (varios MB) ralentizaría
  // toda la aplicación, no solo esta pantalla. Lo reescalamos a un tamaño de sobra para un logo
  // (400px) y lo recodificamos en JPEG con buena calidad antes de guardarlo.
  const comprimirImagenLogo = (file: File, maxDim = 400, calidad = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
            else { width = Math.round(width * (maxDim / height)); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('No se pudo procesar la imagen.'));
          // Fondo blanco de base para que los PNG con transparencia no se vean negros al pasarlos a JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        };
        img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (bloquearEscritura()) { e.target.value = ""; return; }
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
          toast.error("Formato no válido", { description: "Sube una imagen (PNG, JPG o WEBP)." });
          e.target.value = "";
          return;
      }
      if (file.size > 8 * 1024 * 1024) {
          toast.error("Imagen demasiado grande", { description: "El máximo permitido es 8MB." });
          e.target.value = "";
          return;
      }

      try {
          const base64Logo = await comprimirImagenLogo(file);
          setLogo(base64Logo);

          const newSettings = { ...allSettings };
          if (!newSettings.datosFacturacion) newSettings.datosFacturacion = {};
          if (!newSettings.datosFacturacion[empresaId]) newSettings.datosFacturacion[empresaId] = {};
          newSettings.datosFacturacion[empresaId].logo = base64Logo;

          setAllSettings(newSettings);
          await guardarAjustes(newSettings);
          toast.success("Logo actualizado", { description: "Se ha optimizado automáticamente para que la app siga yendo rápida." });
      } catch (err) {
          toast.error("Error al procesar el logo", { description: "Prueba con otra imagen." });
      } finally {
          e.target.value = "";
      }
  };

  const quitarLogo = async () => {
      if (bloquearEscritura()) return;
      setLogo(null);
      const newSettings = { ...allSettings };
      if (newSettings.datosFacturacion && newSettings.datosFacturacion[empresaId]) {
          newSettings.datosFacturacion[empresaId].logo = null;
      }
      setAllSettings(newSettings);
      await guardarAjustes(newSettings);
  };

  const guardarDatosEmisor = async () => {
      if (bloquearEscritura()) return;
      // 🛡️ BLINDAJE DE DATOS: un NIF inválido guardado como predeterminado acabaría en TODAS tus facturas futuras
      if (!nifCifOpcional.safeParse(miNif).success) {
          setFacturaErrors({...facturaErrors, miNif: "Tu NIF/CIF no es válido. Revísalo antes de guardarlo como predeterminado."});
          toast.error("NIF/CIF no válido", { description: "Revisa tu NIF/CIF antes de guardarlo como predeterminado." });
          return;
      }

      const newSettings = { ...allSettings };
      if (!newSettings.datosFacturacion) newSettings.datosFacturacion = {};
      if (!newSettings.datosFacturacion[empresaId]) newSettings.datosFacturacion[empresaId] = {};
      
      newSettings.datosFacturacion[empresaId] = {
          ...newSettings.datosFacturacion[empresaId],
          nif: miNif, direccion: miDireccion, metodoPago: metodoPago, iban: iban
      };
      
      setAllSettings(newSettings);
      const guardadoOk = await guardarAjustes(newSettings);
      if (guardadoOk) toast.success("Datos Fiscales Guardados", { description: `Los datos de ${empresaId} se guardaron por defecto.` });
  };

  const addLinea = () => setLineasFactura([...lineasFactura, { id: Date.now(), concepto: "", cantidad: 1, precio: 0 }]);
  const removeLinea = (id: number) => setLineasFactura(lineasFactura.filter(l => l.id !== id));
  const updateLinea = (id: number, campo: string, valor: any) => {
      setLineasFactura(lineasFactura.map(l => l.id === id ? { ...l, [campo]: valor } : l));
  };

  const baseNum = lineasFactura.reduce((acc, line) => acc + (Number(line.cantidad) * Number(line.precio)), 0);
  const ivaNum = Number(ivaSeleccionado) || 0;
  const cuotaIva = baseNum * (ivaNum / 100);
  const irpfNum = Number(irpfSeleccionado) || 0;
  const cuotaIrpf = baseNum * (irpfNum / 100);
  const totalFinal = baseNum + cuotaIva - cuotaIrpf;

  const datosPDF = {
    modo: modoActivo,
    miEmpresa: nombreEspacioVisible(empresaId) || "Mi Empresa", 
    numeroDocumento: modoActivo === 'factura' ? numeroFactura : numeroPresupuesto, 
    fecha: fecha.split('-').reverse().join('/'),
    miNif, miDireccion, logo, metodoPago, iban,
    clienteNombre, clienteNif, clienteDireccion,
    lineasFactura, baseImponible: baseNum.toFixed(2), 
    ivaSeleccionado, ivaNum, cuotaIva, 
    irpfSeleccionado, cuotaIrpf, 
    totalFinal
  };

  const guardarDocumento = async () => {
    if (bloquearEscritura()) return;
    if (!empresaId) return toast.warning("Falta Espacio", { description: "Por favor, selecciona un Espacio de Trabajo." });
    if (lineasFactura.some(l => !l.concepto)) return toast.warning("Campos Incompletos", { description: "Rellena la descripción de todos los conceptos." });
    if (baseNum <= 0) return toast.warning("Importe Inválido", { description: "Introduce un importe válido mayor a 0." });

    // 🛡️ BLINDAJE DE DATOS: un NIF/CIF inválido no debe acabar impreso en un documento fiscal oficial
    setFacturaErrors({});
    const erroresNif: Record<string, string> = {};
    if (!nifCifOpcional.safeParse(miNif).success) erroresNif.miNif = "Tu NIF/CIF no es válido. Revísalo antes de emitir el documento.";
    if (!nifCifOpcional.safeParse(clienteNif).success) erroresNif.clienteNif = "El NIF/CIF del cliente no es válido. Revísalo antes de emitir el documento.";
    if (Object.keys(erroresNif).length > 0) {
      setFacturaErrors(erroresNif);
      toast.error("Revisa los NIF/CIF", { description: Object.values(erroresNif)[0] });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const [y, m, d] = fecha.split('-');
      const fechaFormateada = `${d}/${m}/${y}`;
      const conceptoUnificado = lineasFactura.map(l => `${l.cantidad}x ${l.concepto}`).join(' | ') + (irpfNum > 0 ? ` (Retención IRPF: -${irpfNum}%)` : "");

      const isPresupuesto = modoActivo === 'presupuesto';
      const numDocumento = isPresupuesto ? numeroPresupuesto : numeroFactura;
      const categoriaDoc = isPresupuesto ? "Presupuestos" : "Ventas";

      const res = await guardarDatoSupabase({
        month: fechaFormateada, total: baseNum, empresaId: empresaId, categoria: categoriaDoc, 
        isRecurrent: false, iva: ivaSeleccionado, numero_factura: numDocumento,
        cliente_nombre: clienteNombre, cliente_nif: clienteNif, concepto_detalle: conceptoUnificado
      });

      if (res.success) {
        if (clienteNombre) {
            // 🚀 CRM REAL: guarda/actualiza el contacto directamente en la tabla ContactoEmpresa
            const existente = clientesCRM.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
            const clientData = { nombre: clienteNombre, nif: clienteNif, direccion: clienteDireccion };

            if (existente) {
                editarContactoCRM({ id: existente.id, empresaId, ...clientData }).then(() => {
                    setClientesCRM(clientesCRM.map(c => c.id === existente.id ? { ...c, ...clientData } : c));
                });
            } else {
                guardarContactoCRM({ empresaId, tipo: 'CLIENTE', ...clientData }).then(res => {
                    if (res.success && res.contacto) setClientesCRM([...clientesCRM, res.contacto as any]);
                });
            }
        }

        // 🛡️ BLINDAJE LEGAL: si el servidor detectó que ese número ya existía (dos pestañas, doble
        // clic...) y lo corrigió automáticamente, actualizamos el estado local para que el PDF y el
        // siguiente número propuesto reflejen el número real que se ha guardado.
        const numeroFinal = (res as any).numero_factura_final;
        if (numeroFinal && numeroFinal !== numDocumento) {
            if (isPresupuesto) setNumeroPresupuesto(numeroFinal); else setNumeroFactura(numeroFinal);
            toast.info("Numeración ajustada", { description: `Ya existía el nº ${numDocumento}, así que se ha asignado el siguiente disponible: ${numeroFinal}.` });
        }

        setFacturaGuardada(true);
        setFacturaBloqueada(true); 
        setRefreshTrigger(prev => prev + 1); 
        toast.success("Documento Registrado", { description: "Guardado correctamente en el Libro Mayor." });
        setTimeout(() => setFacturaGuardada(false), 4000);
      } else {
        toast.error("Error en la nube", { description: "No se pudo guardar el documento." });
      }
    } catch (error) {
      toast.error("Sin conexión", { description: "Error de conexión al intentar guardar." });
    } finally {
      setIsSaving(false);
    }
  };

  const generarFacturaRectificativa = async (facOriginal: any) => {
      if (bloquearEscritura()) return;
      if (facOriginal.numero_factura?.startsWith('R-')) {
          return toast.error("Operación no permitida", { description: "No puedes emitir un abono de una factura rectificativa." });
      }
      // 🛡️ La confirmación real ocurre en el AlertDialog premium; esta función ya llega "confirmada".
      setIsSaving(true);
      try {
          const anioActual = new Date().getFullYear().toString();
          const rectificativasDelAnio = historialFacturas.filter(f => f.numero_factura?.startsWith(`R-${anioActual}`));
          const siguienteNumeroR = rectificativasDelAnio.length + 1;
          const numeroRectificativa = `R-${anioActual}-${String(siguienteNumeroR).padStart(3, '0')}`;

          const fechaFormateada = new Date().toLocaleDateString('es-ES'); 
          const importeNegativo = -Math.abs(Number(facOriginal.total));

          const res = await guardarDatoSupabase({
              month: fechaFormateada,
              total: importeNegativo,
              empresaId: empresaId,
              categoria: "Ventas", 
              isRecurrent: false,
              iva: facOriginal.iva || "21",
              numero_factura: numeroRectificativa,
              cliente_nombre: facOriginal.cliente_nombre,
              cliente_nif: facOriginal.cliente_nif,
              concepto_detalle: `Anulación/Abono de factura ${facOriginal.numero_factura || 'S/N'}`
          });

          if (res.success) {
              toast.success("Abono Creado", { description: `Factura Rectificativa ${numeroRectificativa} generada con éxito.` });
              setRefreshTrigger(prev => prev + 1);
          } else {
              toast.error("Error", { description: "Error al generar la factura rectificativa." });
          }
      } catch (e) {
          toast.error("Error", { description: "Error de conexión." });
      } finally {
          setIsSaving(false);
      }
  };

  const duplicarFactura = (fac: any, aFactura: boolean = false) => {
      if (bloquearEscritura()) return;
      setClienteNombre(fac.cliente_nombre || "");
      setClienteNif(fac.cliente_nif || "");
      setIvaSeleccionado(fac.iva?.toString() || "21");
      
      const clienteCrm = clientesCRM.find(c => c.nombre.toLowerCase() === (fac.cliente_nombre || "").toLowerCase());
      setClienteDireccion(clienteCrm ? clienteCrm.direccion : "");

      let conceptoStr = fac.concepto_detalle || "Servicios generales";
      let irpf = "0";
      
      // Limpiamos los tags de estado si existen
      conceptoStr = conceptoStr.replace(/\[ESTADO: COBRADA\]/g, '').trim();

      const matchIrpf = conceptoStr.match(/\(Retención IRPF: -(\d+)%\)/);
      if (matchIrpf) {
          irpf = matchIrpf[1];
          conceptoStr = conceptoStr.replace(/\s*\(Retención IRPF: -\d+%\)/, '');
      }
      setIrpfSeleccionado(irpf);

      setLineasFactura([{
          id: Date.now(),
          cantidad: 1,
          concepto: conceptoStr,
          precio: Math.abs(Number(fac.total))
      }]);

      setFacturaBloqueada(false);
      
      if (aFactura) {
          setModoActivo("factura");
          toast.info("Presupuesto Cargado", { description: "Revisa los datos y pulsa 'Registrar' para crear la Factura." });
      } else {
          setModoActivo(fac.numero_factura?.startsWith('P-') ? 'presupuesto' : 'factura');
          toast.success("Datos Copiados", { description: "Formulario rellenado con los datos del documento." });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🚀 FUNCIÓN: MARCAR COMO COBRADA
  const marcarCobrada = async (fac: any) => {
     if (bloquearEscritura()) return;
     try {
         const res = await editarDatoSupabase({
             id: fac.id, 
             month: fac.name, 
             total: fac.total, 
             categoria: fac.categoria, 
             iva: fac.iva,
             cliente_nombre: fac.cliente_nombre, 
             cliente_nif: fac.cliente_nif,
             concepto_detalle: (fac.concepto_detalle || "") + " [ESTADO: COBRADA]"
         });
         if (res.success) {
             setRefreshTrigger(prev => prev + 1);
             toast.success("Estado Actualizado", { description: "Documento marcado como COBRADO." });
         } else {
             toast.error("Error", { description: "No se pudo actualizar el estado." });
         }
     } catch (e) { toast.error("Error", { description: "Error de conexión." }); }
  };

  const getDatosPdfHistorico = (fac: any) => {
      let conceptoStr = fac.concepto_detalle || "Servicios prestados";
      conceptoStr = conceptoStr.replace(/\[ESTADO: COBRADA\]/g, '').trim(); // Limpiamos tag visual
      
      let irpf = "0";
      const matchIrpf = conceptoStr.match(/\(Retención IRPF: -(\d+)%\)/);
      if (matchIrpf) {
          irpf = matchIrpf[1];
          conceptoStr = conceptoStr.replace(/\s*\(Retención IRPF: -\d+%\)/, '');
      }
      
      const base = Math.abs(Number(fac.total));
      const ivaN = Number(fac.iva) || 0;
      const irpfN = Number(irpf);
      const cIva = base * (ivaN / 100);
      const cIrpf = base * (irpfN / 100);

      const clienteCrm = clientesCRM.find(c => c.nombre.toLowerCase() === (fac.cliente_nombre || "").toLowerCase());
      const isPresupuesto = fac.numero_factura?.startsWith('P-');

      return {
          modo: isPresupuesto ? 'presupuesto' : 'factura', 
          miEmpresa: nombreEspacioVisible(empresaId) || "Mi Empresa",
          numeroDocumento: fac.numero_factura || 'S/N',
          fecha: fac.name,
          miNif, miDireccion, logo, metodoPago, iban,
          clienteNombre: fac.cliente_nombre || "",
          clienteNif: fac.cliente_nif || "",
          clienteDireccion: clienteCrm ? clienteCrm.direccion : "",
          lineasFactura: [{ cantidad: 1, concepto: conceptoStr, precio: base }],
          baseImponible: base.toFixed(2),
          ivaSeleccionado: fac.iva?.toString() || "0",
          ivaNum: ivaN,
          cuotaIva: cIva,
          irpfSeleccionado: irpf,
          cuotaIrpf: cIrpf,
          totalFinal: base + cIva - cIrpf
      };
  };

  const prepararNuevaFactura = () => {
     setClienteNombre(""); setClienteNif(""); setClienteDireccion(""); 
     setLineasFactura([{ id: Date.now(), concepto: "", cantidad: 1, precio: 0 }]);
     setFacturaBloqueada(false); 
  };

  const guardarNuevoClienteCRM = async () => {
      if (bloquearEscritura()) return;
      setCrmErrors({});
      // 🛡️ BLINDAJE DE DATOS: nombre obligatorio + NIF/CIF con dígito de control real (si se rellena)
      const validacion = contactoCrmSchema.safeParse(nuevoClienteData);
      if (!validacion.success) {
          const errores = mapearErroresZod(validacion.error);
          setCrmErrors(errores);
          toast.error("Revisa los datos del cliente", { description: Object.values(errores)[0] });
          return;
      }

      const datosLimpios = { ...nuevoClienteData, nombre: nuevoClienteData.nombre.trim(), nif: nuevoClienteData.nif.trim().toUpperCase() };

      // 🚀 CRM REAL: se guarda directamente en la tabla ContactoEmpresa
      const res = await guardarContactoCRM({ empresaId, tipo: 'CLIENTE', ...datosLimpios });
      if (!res.success) {
          toast.error("Error al guardar", { description: res.error || "No se pudo guardar el contacto." });
          return;
      }
      setClientesCRM([...clientesCRM, res.contacto as any]);

      setShowNuevoCliente(false);
      setNuevoClienteData({ nombre: "", nif: "", direccion: "", email: "", telefono: "" });
      toast.success("Contacto Añadido", { description: "Cliente guardado en la agenda CRM." });
  };

  const guardarCRMEditado = async (id: number) => {
      if (bloquearEscritura()) return;
      setCrmEditErrors({});
      const validacion = contactoCrmSchema.safeParse(editCRMData);
      if (!validacion.success) {
          const errores = mapearErroresZod(validacion.error);
          setCrmEditErrors(errores);
          toast.error("Revisa los datos del cliente", { description: Object.values(errores)[0] });
          return;
      }

      const datosLimpios = { ...editCRMData, nombre: editCRMData.nombre.trim(), nif: editCRMData.nif.trim().toUpperCase() };

      // 🚀 CRM REAL: actualiza directamente el registro en ContactoEmpresa por su id
      const res = await editarContactoCRM({ id, empresaId, ...datosLimpios });
      if (!res.success) {
          toast.error("Error al actualizar", { description: res.error || "No se pudo actualizar el contacto." });
          return;
      }
      setClientesCRM(clientesCRM.map(c => c.id === id ? { ...c, ...datosLimpios } : c));
      setEditandoClienteId(null);
      toast.success("Contacto Actualizado", { description: "Los cambios se guardaron correctamente." });
  };

  // 🛡️ La confirmación real ocurre en el AlertDialog premium (ver JSX); esta función ya llega "confirmada".
  const confirmarEliminarClienteCRM = async () => {
      if (bloquearEscritura()) { setCrmIdToDelete(null); return; }
      if (crmIdToDelete === null) return;
      const id = crmIdToDelete;
      setCrmIdToDelete(null);

      const res = await borrarContactoCRM(id, empresaId);
      if (res.error) {
          toast.error("Error al borrar", { description: res.error });
          return;
      }
      setClientesCRM(clientesCRM.filter(c => c.id !== id));
      toast.info("Contacto Eliminado", { description: "El cliente ha sido borrado de la agenda." });
  };

  const iniciarEdicionCliente = (fac: any) => {
     if (bloquearEscritura()) return;
     setEditandoHistorialId(fac.id);
     setEditClientData({ nombre: fac.cliente_nombre || "", nif: fac.cliente_nif || "" });
  };

  const guardarEdicionHistorial = async (fac: any) => {
      if (bloquearEscritura()) return;
      try {
          const res = await editarDatoSupabase({
              id: fac.id, month: fac.name, total: fac.total, categoria: fac.categoria, iva: fac.iva,
              cliente_nombre: editClientData.nombre, cliente_nif: editClientData.nif, concepto_detalle: fac.concepto_detalle
          });
          if (res.success) {
              setEditandoHistorialId(null);
              setRefreshTrigger(prev => prev + 1);
              toast.success("Documento Actualizado", { description: "Los datos del cliente han sido modificados." });
          }
      } catch(e) { toast.error("Error", { description: "Error al actualizar." }); }
  };

  // 🛡️ La confirmación real ocurre en el AlertDialog premium (ver JSX); esta función ya llega "confirmada".
  const confirmarEliminarDato = async () => {
    if (bloquearEscritura()) { setDocIdToDelete(null); return; }
    if (docIdToDelete === null) return;
    const id = docIdToDelete;
    setDocIdToDelete(null);

    const res = await borrarDatoSupabase(id.toString(), empresaId);
    if (res.success) {
      setRefreshTrigger(prev => prev + 1);
      toast.success("Documento Eliminado", { description: "El registro ha sido borrado del historial." });
    } else {
      toast.error("Error", { description: res.error || "No se pudo borrar el documento." });
    }
  };

  // 🚀 RENDIMIENTO: se recalcula solo si cambian el historial, la búsqueda o el filtro activo
  // (antes se recalculaba en cada render, incluso al escribir en el chat de IA o abrir modales)
  const filteredHistorial = useMemo(() => {
    return historialFacturas.filter((fac: any) => {
       const search = searchTerm.toLowerCase();
       const numFac = fac.numero_factura?.toLowerCase() || "";
       const cliente = fac.cliente_nombre?.toLowerCase() || "";
       const conceptoStr = fac.concepto_detalle?.toLowerCase() || "";
       const matchSearch = numFac.includes(search) || cliente.includes(search) || conceptoStr.includes(search);
       if (!matchSearch) return false;

       if (filtroHistorial === 'facturas' && !numFac.startsWith('f-')) return false;
       if (filtroHistorial === 'presupuestos' && !numFac.startsWith('p-')) return false;
       if (filtroHistorial === 'rectificativas' && !numFac.startsWith('r-')) return false;

       return true;
    });
  }, [historialFacturas, searchTerm, filtroHistorial]);

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const currentItems = filteredHistorial.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clientesFiltrados = useMemo(() => {
    return clientesCRM.filter(c => c.nombre.toLowerCase().includes(clienteNombre.toLowerCase()));
  }, [clientesCRM, clienteNombre]);
  
  // 🚀 LÓGICA RADAR DE MOROSIDAD (RENDIMIENTO: solo depende del historial, no de la búsqueda)
  const { facturasPendientesArr, totalPendienteMonto, totalVencidoMonto } = useMemo(() => {
    const ahora = new Date().getTime();
    const pendientesArr = historialFacturas.filter((f: any) => {
        const isPresu = f.numero_factura?.startsWith('P-');
        const isRect = f.numero_factura?.startsWith('R-');
        const isCobrada = f.concepto_detalle?.includes('[ESTADO: COBRADA]');
        return !isPresu && !isRect && !isCobrada;
    });

    let pendienteMonto = 0;
    let vencidoMonto = 0;

    pendientesArr.forEach((f: any) => {
        const base = Math.abs(Number(f.total));
        const iva = Number(f.iva) || 0;
        const totalFac = base + (base * (iva/100));
        
        pendienteMonto += totalFac;

        const [d, m, y] = f.name.split('/');
        const fechaEmision = new Date(Number(y), Number(m)-1, Number(d)).getTime();
        const diasDesdeEmision = (ahora - fechaEmision) / (1000 * 3600 * 24);
        
        if (diasDesdeEmision > 30) {
            vencidoMonto += totalFac;
        }
    });

    return { facturasPendientesArr: pendientesArr, totalPendienteMonto: pendienteMonto, totalVencidoMonto: vencidoMonto };
  }, [historialFacturas]);

  const faqs = [
      { q: "📝 ¿Cómo creo y envío una factura oficial a mi cliente?", a: "Rellena tus datos fiscales (pulsa 'Guardar como predeterminado' para no tener que repetirlos). Pon los datos del cliente, el concepto y el precio. Dale a 'Registrar en Libro Mayor' y luego descarga el PDF oficial para enviarlo." },
      { q: "🪄 ¿Qué diferencia hay entre Presupuesto y Factura?", a: "Un Presupuesto es una propuesta. No suman en tus ingresos y son 'invisibles' para los impuestos. Cuando tu cliente lo acepte, busca el presupuesto en el historial y pulsa el botón '🪄 Convertir'." },
      { q: "❌ Me he equivocado en una factura ya emitida. ¿La borro?", a: "¡Cuidado! La ley prohíbe borrar o saltarse la numeración de facturas ya emitidas. En el Historial, busca la factura con el error y pulsa 'Rectificar'. Se creará un Abono en negativo para anularla legalmente." }
  ];
  const faqsFiltradas = faqs.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()));

  if (!isMounted) return null;

  if (planActivo === 'loading' && isSignedIn) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" translate="no">
           <img src="/icon-192x192.png" alt="TaxGuard AI Logo" className="w-16 h-16 bg-white rounded-2xl p-2 object-contain shadow-2xl shadow-blue-500/20 mb-6 animate-pulse" />
           <h2 className="text-xl font-black tracking-tight mb-2">Preparando entorno de facturación...</h2>
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

      {/* 🛡️ Confirmaciones premium: sustituyen los window.confirm() nativos del navegador */}
      <AlertDialog open={docIdToDelete !== null} onOpenChange={(open) => { if (!open) setDocIdToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento se borrará de forma permanente del historial de facturación.
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

      <AlertDialog open={crmIdToDelete !== null} onOpenChange={(open) => { if (!open) setCrmIdToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este contacto de la agenda?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente se eliminará de tu CRM. Las facturas ya emitidas a su nombre no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarClienteCRM} className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500">
              Sí, borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={facturaRectificativaPendiente !== null} onOpenChange={(open) => { if (!open) setFacturaRectificativaPendiente(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Emitir Factura Rectificativa (Abono)?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a anular la factura {facturaRectificativaPendiente?.numero_factura || 'S/N'} creando un registro en negativo en el Libro Mayor. Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const fac = facturaRectificativaPendiente;
                setFacturaRectificativaPendiente(null);
                if (fac) generarFacturaRectificativa(fac);
              }}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            >
              Sí, emitir abono
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Show when="signed-in">
        <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative text-slate-800" translate="no">
          
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
                    {puedeEscribir && (
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
                <Link className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20" href="/facturas" onClick={() => setIsSidebarOpen(false)}>
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

          {/* 🚀 MAIN CONTENT */}
          <main className="flex-1 p-4 pt-24 lg:pt-10 lg:p-10 overflow-y-auto w-full relative">
            {esLectura && (
              <BannerModoAsesor nombreCliente={nombreEspacioVisible(empresaId)} onSalir={salirModoAsesor} />
            )}
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {modoActivo === 'factura' ? 'Creador de Facturas' : 'Creador de Presupuestos'}
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    {modoActivo === 'factura' ? 'Genera PDFs profesionales y súbelos a tu Libro Mayor en 1 clic.' : 'Envía propuestas comerciales elegantes sin generar carga fiscal.'}
                    {' · '}<span className="font-bold text-blue-600">{nombreEspacioVisible(empresaId)}</span>
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 {puedeEscribir && (
                 <button onClick={prepararNuevaFactura} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    {modoActivo === 'factura' ? 'Nueva Factura' : 'Nuevo Presupuesto'}
                 </button>
                 )}
                 {facturaBloqueada && (
                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                        ✅ Documento Guardado
                    </span>
                 )}
              </div>
            </header>

            {/* PESTAÑAS FACTURAS VS PRESUPUESTOS */}
            <div className="flex gap-6 mb-8 border-b border-slate-200">
               <button 
                  onClick={() => setModoActivo("factura")} 
                  className={`pb-3 text-sm font-black transition border-b-2 ${modoActivo === 'factura' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
               >
                  📄 Facturas Oficiales
               </button>
               <button 
                  onClick={() => setModoActivo("presupuesto")} 
                  className={`pb-3 text-sm font-black transition border-b-2 ${modoActivo === 'presupuesto' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
               >
                  📝 Presupuestos / Cotizaciones
               </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-6">
                
                {/* DATOS DEL EMISOR Y LOGO */}
                <div className={`bg-white p-6 md:p-8 rounded-3xl border shadow-sm relative overflow-hidden ${modoActivo === 'presupuesto' ? 'border-amber-200' : 'border-slate-200'}`}>
                   <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full pointer-events-none ${modoActivo === 'presupuesto' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                   
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${modoActivo === 'presupuesto' ? 'bg-amber-500' : 'bg-blue-500'}`}></span> 1. Tus Datos Fiscales
                      </h3>
                      {puedeEscribir && (
                      <button onClick={guardarDatosEmisor} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md transition border border-slate-200">
                         💾 Guardar como predeterminado
                      </button>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                         <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tu NIF / CIF</label>
                           <input type="text" value={miNif} onChange={(e) => { setMiNif(e.target.value.toUpperCase()); if (facturaErrors.miNif) setFacturaErrors({...facturaErrors, miNif: ''}); }} className={`w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${facturaErrors.miNif ? 'border-rose-400 bg-rose-50' : 'border-slate-200 text-slate-900'}`} />
                           {facturaErrors.miNif && <p className="text-[10px] font-bold text-rose-500 mt-1">{facturaErrors.miNif}</p>}
                         </div>
                         <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tu Dirección Completa</label>
                           <input type="text" value={miDireccion} onChange={(e) => setMiDireccion(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                               {modoActivo === 'factura' ? 'Nº de Factura' : 'Nº de Presupuesto'}
                            </label>
                            <input 
                               type="text" 
                               value={modoActivo === 'factura' ? numeroFactura : numeroPresupuesto} 
                               onChange={(e) => modoActivo === 'factura' ? setNumeroFactura(e.target.value) : setNumeroPresupuesto(e.target.value)} 
                               className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner" 
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Fecha Emisión</label>
                               <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Logo Empresa</label>
                               {logo ? (
                                   <div className="flex items-center gap-2 mt-1">
                                      <img src={logo} alt="Logo Empresa" className="h-8 object-contain rounded border border-slate-200 p-0.5 bg-white" />
                                      {puedeEscribir && (
                                      <button onClick={quitarLogo} className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-100 hover:bg-rose-100 transition">
                                          Quitar Logo
                                      </button>
                                      )}
                                   </div>
                               ) : puedeEscribir ? (
                                   <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                               ) : (
                                   <p className="text-[10px] text-slate-400 mt-1 italic">Sin logo</p>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* DATOS DEL CLIENTE CON MINI-CRM */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> 2. Facturar a (Cliente)
                      </h3>
                      <button onClick={() => setShowCRMModal(true)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md transition border border-slate-200 flex items-center gap-1">
                         👥 Gestor de Clientes ({clientesCRM.length})
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nombre del Cliente</label>
                        <input 
                           type="text" 
                           value={clienteNombre} 
                           onChange={(e) => {
                               setClienteNombre(e.target.value);
                               setShowCRM(true);
                           }} 
                           onFocus={() => setShowCRM(true)}
                           onBlur={() => setTimeout(() => setShowCRM(false), 200)}
                           className="w-full p-2.5 bg-emerald-50/30 border border-emerald-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" 
                           placeholder="Ej: Zona Alpha S.L."
                        />
                        {showCRM && clientesFiltrados.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto">
                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contactos Recurrentes</span>
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-sm">{clientesFiltrados.length}</span>
                                </div>
                                {clientesFiltrados.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition flex justify-between items-center"
                                        onClick={() => {
                                            setClienteNombre(c.nombre);
                                            setClienteNif(c.nif);
                                            setClienteDireccion(c.direccion);
                                            setShowCRM(false);
                                        }}
                                    >
                                        <div>
                                           <div className="text-xs font-bold text-slate-800">{c.nombre}</div>
                                           <div className="text-[10px] text-slate-500 mt-0.5">NIF: {c.nif}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">NIF / CIF del Cliente</label>
                        <input type="text" value={clienteNif} onChange={(e) => { setClienteNif(e.target.value.toUpperCase()); if (facturaErrors.clienteNif) setFacturaErrors({...facturaErrors, clienteNif: ''}); }} className={`w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 ${facturaErrors.clienteNif ? 'border-rose-400 bg-rose-50' : 'border-slate-200 text-slate-900'}`} />
                        {facturaErrors.clienteNif && <p className="text-[10px] font-bold text-rose-500 mt-1">{facturaErrors.clienteNif}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dirección del Cliente</label>
                        <input type="text" value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                   </div>
                </div>

                {/* CONCEPTOS */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-orange-500 rounded-full"></span> 3. Líneas de Factura
                      </h3>
                   </div>
                   
                   <div className="space-y-3">
                      {lineasFactura.map((linea, idx) => (
                        <div key={linea.id} className="flex flex-col sm:flex-row gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="w-full sm:w-16">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cant</label>
                              <input type="number" min="1" value={linea.cantidad} onChange={(e) => updateLinea(linea.id, 'cantidad', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm font-bold outline-none text-center" />
                           </div>
                           <div className="w-full sm:flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Concepto / Descripción</label>
                              <input type="text" value={linea.concepto} onChange={(e) => updateLinea(linea.id, 'concepto', e.target.value)} placeholder="Ej: Servicios de consultoría" className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none" />
                           </div>
                           <div className="w-full sm:w-32">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precio Un. (€)</label>
                              <input type="number" step="0.01" value={linea.precio} onChange={(e) => updateLinea(linea.id, 'precio', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-sm font-bold outline-none text-right" />
                           </div>
                           {lineasFactura.length > 1 && (
                              <button onClick={() => removeLinea(linea.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition mb-[1px]">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                           )}
                        </div>
                      ))}
                   </div>
                   
                   <button onClick={addLinea} className="mt-4 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-1">
                      + Añadir Concepto
                   </button>
                </div>
              </div>

              {/* PANEL LATERAL: TOTALES Y ACCIONES */}
              <div className="space-y-6">
                 
                 <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-full pointer-events-none ${modoActivo === 'presupuesto' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-6 border-b border-slate-800 pb-4 ${modoActivo === 'presupuesto' ? 'text-amber-400' : 'text-blue-400'}`}>
                       Resumen Económico
                    </h3>
                    
                    <div className="space-y-4 mb-6">
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400 font-medium">Subtotal (Base)</span>
                          <span className="text-base font-bold">{baseNum.toFixed(2)} €</span>
                       </div>
                       
                       <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                             <span className="text-sm text-slate-400 font-medium">Impuestos</span>
                             <select value={ivaSeleccionado} onChange={(e) => setIvaSeleccionado(e.target.value)} className="mt-1 bg-slate-800 text-xs text-white border border-slate-700 rounded p-1 outline-none">
                                <option value="21">IVA 21%</option>
                                <option value="10">IVA 10%</option>
                                <option value="4">IVA 4%</option>
                                <option value="0">Exento (0%)</option>
                             </select>
                          </div>
                          <span className="text-base font-bold text-slate-300">+{cuotaIva.toFixed(2)} €</span>
                       </div>

                       <div className="flex justify-between items-center pt-2">
                          <div className="flex flex-col">
                             <span className="text-sm text-slate-400 font-medium">Retención IRPF</span>
                             <select value={irpfSeleccionado} onChange={(e) => setIrpfSeleccionado(e.target.value)} className="mt-1 bg-slate-800 text-xs text-white border border-slate-700 rounded p-1 outline-none">
                                <option value="0">Sin retención (0%)</option>
                                <option value="7">Nuevos autónomos (7%)</option>
                                <option value="15">Profesionales (15%)</option>
                             </select>
                          </div>
                          {cuotaIrpf > 0 ? (
                              <span className="text-base font-bold text-rose-500">-{cuotaIrpf.toFixed(2)} €</span>
                          ) : (
                              <span className="text-base font-bold text-slate-500">0.00 €</span>
                          )}
                       </div>
                    </div>
                    
                    <div className="border-t border-slate-700 pt-6">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                          {modoActivo === 'presupuesto' ? 'Total Estimado' : 'Total a Facturar'}
                       </span>
                       <span className="text-4xl font-black text-white">{totalFinal.toFixed(2)} €</span>
                    </div>

                    <div className="mt-8 space-y-3">
                       {/* BOTÓN DESCARGAR PDF DINÁMICO */}
                       {isMounted && (
                           <FacturaPDFButtonPrincipal
                               datos={datosPDF}
                               fileName={modoActivo === 'factura' ? `${numeroFactura}_${clienteNombre || 'Cliente'}.pdf` : `${numeroPresupuesto}_${clienteNombre || 'Cliente'}.pdf`}
                           >
                               {(loading: boolean) => (
                                   <button disabled={loading} className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${modoActivo === 'presupuesto' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                      {loading ? "Generando PDF..." : modoActivo === 'presupuesto' ? "Descargar Presupuesto PDF" : "Descargar Factura PDF"}
                                   </button>
                               )}
                           </FacturaPDFButtonPrincipal>
                       )}
                       
                       {/* BOTÓN GUARDAR (Dinámico para Factura o Presupuesto) */}
                       {puedeEscribir ? (
                       <button 
                          onClick={guardarDocumento} 
                          disabled={isSaving || facturaBloqueada}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl border border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                          {isSaving ? "Guardando..." : facturaGuardada ? "¡Guardado con éxito!" : modoActivo === 'factura' ? "Registrar en Libro Mayor" : "Guardar Presupuesto"}
                       </button>
                       ) : (
                       <div className="w-full bg-slate-100 text-slate-500 font-bold py-3.5 rounded-xl border border-slate-200 text-center text-sm">
                          Solo lectura · Modo Asesor
                       </div>
                       )}
                    </div>
                 </div>

                 {/* MÉTODO DE PAGO */}
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Datos de Cobro</h3>
                    <div className="space-y-4">
                       <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Método Preferido</label>
                         <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none">
                            <option value="Transferencia">Transferencia Bancaria</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta / TPV</option>
                            <option value="Domiciliación">Domiciliación SEPA</option>
                         </select>
                       </div>
                       {metodoPago === 'Transferencia' && (
                         <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tu IBAN</label>
                           <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="ESXX XXXX XXXX..." className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-semibold outline-none" />
                         </div>
                       )}
                    </div>
                 </div>

              </div>
            </div>

            {/* 🚀 RADAR DE MOROSIDAD */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex flex-col justify-center relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                     <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                     <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Pendiente de Cobro</h3>
                  </div>
                  <span className="text-3xl font-black text-amber-700 relative z-10">{totalPendienteMonto.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                  <span className="text-xs font-bold text-amber-600 mt-1 relative z-10">Facturas emitidas no cobradas</span>
               </div>
               <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200 flex flex-col justify-center relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                     <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                     <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Vencido (+30 Días)</h3>
                  </div>
                  <span className="text-3xl font-black text-rose-700 relative z-10">{totalVencidoMonto.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                  <span className="text-xs font-bold text-rose-600 mt-1 relative z-10">Riesgo de impago activo</span>
               </div>
            </div>

            {/* 🚀 TABLA DE HISTORIAL RÁPIDO CON FILTROS Y ESTADOS */}
            <div className="mt-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4">
                       <div className="flex items-center gap-3">
                          <h3 className="text-md font-bold text-slate-900">Historial de Documentos</h3>
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-full">{isLoadingHistorial ? '...' : filteredHistorial.length}</span>
                       </div>
                       <input 
                         type="text" 
                         placeholder="🔍 Buscar factura, presupuesto, cliente..." 
                         value={searchTerm}
                         onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                         className="w-full lg:w-64 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                       />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                       <button onClick={() => {setFiltroHistorial('todas'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroHistorial === 'todas' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todas</button>
                       <button onClick={() => {setFiltroHistorial('facturas'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroHistorial === 'facturas' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}>Solo Facturas</button>
                       <button onClick={() => {setFiltroHistorial('presupuestos'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroHistorial === 'presupuestos' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600'}`}>Presupuestos</button>
                       <button onClick={() => {setFiltroHistorial('rectificativas'); setCurrentPage(1);}} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition border ${filtroHistorial === 'rectificativas' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600'}`}>Abonos</button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left whitespace-nowrap">
                       <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <tr>
                             <th className="px-4 py-3">Documento</th>
                             <th className="px-4 py-3">Cliente / NIF</th>
                             <th className="px-4 py-3">Base Imponible</th>
                             <th className="px-4 py-3">Impuestos</th>
                             <th className="px-4 py-3">Total Final</th>
                             <th className="px-4 py-3 text-center">Estado</th>
                             <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                          {isLoadingHistorial && Array.from({ length: 6 }).map((_, i) => (
                             <tr key={`skeleton-${i}`}>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                                <td className="px-4 py-3 text-right"><Skeleton className="h-6 w-28 ml-auto" /></td>
                             </tr>
                          ))}
                          {!isLoadingHistorial && currentItems.map((fac: any) => {
                             const isRectificativa = fac.numero_factura?.startsWith('R-');
                             const isPresupuesto = fac.numero_factura?.startsWith('P-');
                             const isCobrada = fac.concepto_detalle?.includes('[ESTADO: COBRADA]');
                             
                             // 🚀 CÁLCULO VISUAL REAL (3 COLUMNAS)
                             const baseReal = Math.abs(Number(fac.total));
                             const ivaPorc = Number(fac.iva) || 0;
                             
                             let irpfPorc = 0;
                             const matchIrpf = (fac.concepto_detalle || "").match(/\(Retención IRPF: -(\d+)%\)/);
                             if (matchIrpf) { irpfPorc = Number(matchIrpf[1]); }
                             
                             const cuotaIvaReal = baseReal * (ivaPorc / 100);
                             const cuotaIrpfReal = baseReal * (irpfPorc / 100);
                             const totalRealFinal = baseReal + cuotaIvaReal - cuotaIrpfReal;

                             const signoOpe = isPresupuesto ? '+' : (isRectificativa ? '-' : '+');
                             const colorSig = isPresupuesto ? 'text-amber-600' : (isRectificativa ? 'text-rose-600' : 'text-emerald-600');

                            const [d, m, y] = fac.name.split('/');
                            const fechaEmision = new Date(Number(y), Number(m)-1, Number(d)).getTime();
                            const diasDesdeEmision = (Date.now() - fechaEmision) / (1000 * 3600 * 24);
                            const isVencida = !isCobrada && !isPresupuesto && !isRectificativa && (diasDesdeEmision > 30);

                             if (editandoHistorialId === fac.id) {
                                 return (
                                     <tr key={fac.id} className="bg-blue-50/30">
                                         <td className="px-4 py-3">
                                            <div className={`font-bold ${isRectificativa ? 'text-rose-600' : isPresupuesto ? 'text-amber-600' : 'text-slate-900'}`}>{fac.numero_factura || 'S/N'}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{fac.name}</div>
                                         </td>
                                         <td className="px-4 py-3 space-y-1">
                                             <input type="text" value={editClientData.nombre} onChange={(e) => setEditClientData({...editClientData, nombre: e.target.value})} placeholder="Nombre Cliente" className="w-full p-1 border border-blue-300 rounded text-xs outline-none block" />
                                             <input type="text" value={editClientData.nif} onChange={(e) => setEditClientData({...editClientData, nif: e.target.value})} placeholder="NIF Cliente" className="w-full p-1 border border-blue-300 rounded text-xs outline-none block" />
                                         </td>
                                         <td className="px-4 py-3 font-bold text-slate-700">{baseReal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                                         <td className="px-4 py-3 text-xs text-slate-400 italic">Auto</td>
                                         <td className="px-4 py-3 font-bold text-slate-700">{totalRealFinal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                                         <td className="px-4 py-3 text-center text-slate-400 text-xs">En edición</td>
                                         <td className="px-4 py-3 text-right space-x-3">
                                            <button onClick={() => guardarEdicionHistorial(fac)} className="text-emerald-600 font-bold text-xs hover:underline">Guardar</button>
                                            <button onClick={() => setEditandoHistorialId(null)} className="text-slate-500 font-bold text-xs hover:underline">Cancelar</button>
                                         </td>
                                     </tr>
                                 );
                             }

                             return (
                                 <tr key={fac.id} className="hover:bg-slate-50/80 transition">
                                     <td className="px-4 py-3">
                                        <div className={`font-bold ${isRectificativa ? 'text-rose-600' : isPresupuesto ? 'text-amber-600' : 'text-slate-900'}`}>{fac.numero_factura || 'S/N'}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{fac.name}</div>
                                     </td>
                                     <td className="px-4 py-3">
                                        <div className="font-bold text-slate-800">{fac.cliente_nombre || 'Sin asignar'}</div>
                                        <div className="text-[10px] text-slate-400">NIF: {fac.cliente_nif || '-'}</div>
                                     </td>
                                     
                                     {/* 🚀 3 COLUMNAS MATEMÁTICAS */}
                                     <td className="px-4 py-3 font-bold text-slate-700">
                                        {baseReal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                                     </td>
                                     <td className="px-4 py-3">
                                        <div className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                                           {ivaPorc === 0 && irpfPorc === 0 ? "Exento" : (
                                               <>
                                                   {ivaPorc > 0 && <span>+IVA {ivaPorc}% </span>}
                                                   {irpfPorc > 0 && <span className="text-rose-500">-IRPF {irpfPorc}%</span>}
                                               </>
                                           )}
                                        </div>
                                     </td>
                                     <td className={`px-4 py-3 font-black text-base ${colorSig}`}>
                                        {signoOpe}{totalRealFinal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                                     </td>

                                     <td className="px-4 py-3 text-center">
                                        {isRectificativa ? (
                                           <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider border border-rose-200">Abono</span>
                                        ) : isPresupuesto ? (
                                           <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider border border-amber-200">Presupuesto</span>
                                        ) : isCobrada ? (
                                           <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider border border-emerald-200">Cobrada</span>
                                        ) : isVencida ? (
                                           <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider border border-rose-200">Vencida</span>
                                        ) : (
                                           <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider border border-blue-200">Pendiente</span>
                                        )}
                                     </td>
                                     <td className="px-4 py-3 text-right">
                                         <div className="flex items-center justify-end gap-2">
                                             {/* 🚀 BOTÓN COBRAR */}
                                             {puedeEscribir && !isPresupuesto && !isRectificativa && !isCobrada && (
                                                 <button onClick={() => marcarCobrada(fac)} className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-1.5 rounded-md transition border border-emerald-200" title="Marcar como cobrada">
                                                     💰 Cobrar
                                                 </button>
                                             )}

                                             {/* BOTÓN DESCARGAR PDF HISTÓRICO */}
                                             {isMounted && (
                                                 <FacturaPDFButtonHistorico
                                                     datos={getDatosPdfHistorico(fac)}
                                                     fileName={`${fac.numero_factura}_${fac.cliente_nombre || 'Cliente'}.pdf`}
                                                 >
                                                     {(loading: boolean) => (
                                                         <button disabled={loading} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition border border-slate-200" title="Descargar PDF original">
                                                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                         </button>
                                                     )}
                                                 </FacturaPDFButtonHistorico>
                                             )}

                                             {puedeEscribir && (
                                             <>
                                             {/* BOTÓN CONVERTIR O DUPLICAR */}
                                             {isPresupuesto ? (
                                                <button onClick={() => duplicarFactura(fac, true)} className="text-amber-600 hover:text-amber-700 font-bold text-[10px] uppercase tracking-wider bg-amber-50 px-2 py-1.5 rounded-md transition border border-amber-200 flex items-center gap-1" title="Convertir a Factura Oficial">
                                                    🪄 Convertir
                                                </button>
                                             ) : (
                                                <button onClick={() => duplicarFactura(fac, false)} className="text-blue-500 hover:text-blue-700 font-bold text-[10px] uppercase tracking-wider bg-blue-50 px-2 py-1.5 rounded-md transition border border-blue-100" title="Copiar datos para nueva factura">
                                                    Duplicar
                                                </button>
                                             )}

                                             {/* EDITAR */}
                                             <button onClick={() => iniciarEdicionCliente(fac)} className="text-slate-500 hover:text-slate-700 font-bold text-[10px] uppercase tracking-wider bg-slate-50 px-2 py-1.5 rounded-md transition border border-slate-200" title="Editar cliente o NIF">
                                                Editar
                                             </button>
                                             
                                             {/* BOTÓN RECTIFICAR */}
                                             {!isRectificativa && !isPresupuesto && (
                                                 <button 
                                                    onClick={() => setFacturaRectificativaPendiente(fac)} 
                                                    className="text-rose-500 hover:text-rose-700 font-bold text-[10px] uppercase tracking-wider bg-rose-50 px-2 py-1.5 rounded-md transition border border-rose-100"
                                                    title="Anular factura y crear Abono"
                                                 >
                                                    Rectificar
                                                 </button>
                                             )}
                                             <button onClick={() => setDocIdToDelete(fac.id)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md transition border border-transparent hover:border-rose-100 hover:bg-rose-50" title="Eliminar documento">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                             </button>
                                             </>
                                             )}
                                         </div>
                                     </td>
                                 </tr>
                             );
                          })}
                          {!isLoadingHistorial && filteredHistorial.length === 0 && (
                             <tr><td colSpan={7} className="px-6 py-10 text-center text-xs text-slate-400">No hay documentos que coincidan con este filtro.</td></tr>
                          )}
                       </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                     <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50">Anterior</button>
                     <span className="text-xs font-semibold text-slate-500">Página <span className="font-black text-slate-700">{currentPage}</span> de {totalPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50">Siguiente</button>
                  </div>
                )}
            </div>

            <div className="h-20"></div>
          </main>
        </div>

        {/* 🚀 MODAL DEL GESTOR CRM */}
        {showCRMModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" translate="no">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                   <div>
                       <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                           👥 Gestor de Clientes (CRM)
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">Directorio de {nombreEspacioVisible(empresaId)}. Los clientes se añaden automáticamente al facturar.</p>
                   </div>
                   <div className="flex items-center gap-3">
                       {puedeEscribir && (
                       <button onClick={() => { setShowNuevoCliente(!showNuevoCliente); setCrmErrors({}); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm">
                           {showNuevoCliente ? "Cancelar" : "+ Nuevo Cliente"}
                       </button>
                       )}
                       <button onClick={() => setShowCRMModal(false)} className="text-slate-400 hover:text-rose-500 transition p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                   </div>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                   
                   {showNuevoCliente && (
                       <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 mb-6 shadow-inner">
                           <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4">Añadir Contacto Manual</h4>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nombre</label>
                                  <input type="text" value={nuevoClienteData.nombre} onChange={e => { setNuevoClienteData({...nuevoClienteData, nombre: e.target.value}); if (crmErrors.nombre) setCrmErrors({...crmErrors, nombre: ''}); }} placeholder="Ej: Mercadona SA" className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmErrors.nombre ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                  {crmErrors.nombre && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmErrors.nombre}</p>}
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">NIF / CIF</label>
                                  <input type="text" value={nuevoClienteData.nif} onChange={e => { setNuevoClienteData({...nuevoClienteData, nif: e.target.value.toUpperCase()}); if (crmErrors.nif) setCrmErrors({...crmErrors, nif: ''}); }} placeholder="A12345678" className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmErrors.nif ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                  {crmErrors.nif && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmErrors.nif}</p>}
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dirección</label>
                                  <input type="text" value={nuevoClienteData.direccion} onChange={e => setNuevoClienteData({...nuevoClienteData, direccion: e.target.value})} placeholder="Calle Principal 1" className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                                  <input type="email" value={nuevoClienteData.email} onChange={e => { setNuevoClienteData({...nuevoClienteData, email: e.target.value}); if (crmErrors.email) setCrmErrors({...crmErrors, email: ''}); }} placeholder="contacto@empresa.com" className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmErrors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                  {crmErrors.email && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmErrors.email}</p>}
                               </div>
                               <div>
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                                  <input type="tel" value={nuevoClienteData.telefono} onChange={e => { setNuevoClienteData({...nuevoClienteData, telefono: e.target.value}); if (crmErrors.telefono) setCrmErrors({...crmErrors, telefono: ''}); }} placeholder="+34 600 000 000" className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmErrors.telefono ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`} />
                                  {crmErrors.telefono && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmErrors.telefono}</p>}
                               </div>
                           </div>
                           <button onClick={guardarNuevoClienteCRM} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover:bg-blue-700 w-full sm:w-auto">
                               Guardar en Agenda
                           </button>
                       </div>
                   )}

                   {clientesCRM.length === 0 && !showNuevoCliente ? (
                      <div className="text-center py-12">
                         <span className="text-4xl block mb-4">📇</span>
                         <p className="text-sm font-bold text-slate-600 mb-1">Tu agenda está vacía</p>
                         <p className="text-xs text-slate-400">Rellena los datos de un cliente y pulsa "Registrar en Libro Mayor" para guardarlo automáticamente, o pulsa "+ Nuevo Cliente".</p>
                      </div>
                   ) : (
                      clientesCRM.map((c) => (
                         <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 transition hover:border-blue-200 hover:shadow-md">
                            {editandoClienteId === c.id ? (
                               <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nombre</label>
                                     <input type="text" value={editCRMData.nombre} onChange={e => setEditCRMData({...editCRMData, nombre: e.target.value})} className="w-full p-2.5 border border-blue-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                  </div>
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">NIF / CIF</label>
                                     <input type="text" value={editCRMData.nif} onChange={e => { setEditCRMData({...editCRMData, nif: e.target.value.toUpperCase()}); if (crmEditErrors.nif) setCrmEditErrors({...crmEditErrors, nif: ''}); }} className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmEditErrors.nif ? 'border-rose-400 bg-rose-50' : 'border-blue-300'}`} />
                                     {crmEditErrors.nif && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmEditErrors.nif}</p>}
                                  </div>
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Dirección</label>
                                     <input type="text" value={editCRMData.direccion} onChange={e => setEditCRMData({...editCRMData, direccion: e.target.value})} className="w-full p-2.5 border border-blue-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                  </div>
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                                     <input type="email" value={editCRMData.email} onChange={e => { setEditCRMData({...editCRMData, email: e.target.value}); if (crmEditErrors.email) setCrmEditErrors({...crmEditErrors, email: ''}); }} className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmEditErrors.email ? 'border-rose-400 bg-rose-50' : 'border-blue-300'}`} />
                                     {crmEditErrors.email && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmEditErrors.email}</p>}
                                  </div>
                                  <div>
                                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Teléfono</label>
                                     <input type="tel" value={editCRMData.telefono} onChange={e => { setEditCRMData({...editCRMData, telefono: e.target.value}); if (crmEditErrors.telefono) setCrmEditErrors({...crmEditErrors, telefono: ''}); }} className={`w-full p-2.5 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${crmEditErrors.telefono ? 'border-rose-400 bg-rose-50' : 'border-blue-300'}`} />
                                     {crmEditErrors.telefono && <p className="text-[10px] font-bold text-rose-500 mt-1">{crmEditErrors.telefono}</p>}
                                  </div>
                               </div>
                            ) : (
                               <div className="flex-1">
                                  <h4 className="text-sm font-black text-slate-900">{c.nombre}</h4>
                                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                                     <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold mr-2">NIF: {c.nif}</span>
                                     📍 {c.direccion}
                                  </p>
                                  {(c.email || c.telefono) && (
                                     <p className="text-[11px] font-medium text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
                                        {c.email && <span className="inline-flex items-center gap-1">✉️ {c.email}</span>}
                                        {c.telefono && <span className="inline-flex items-center gap-1">📞 {c.telefono}</span>}
                                     </p>
                                  )}
                               </div>
                            )}
                            
                            <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-0 md:pt-0">
                               {editandoClienteId === c.id ? (
                                  <>
                                     <button onClick={() => guardarCRMEditado(c.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[11px] font-bold transition shadow-sm">Guardar</button>
                                     <button onClick={() => { setEditandoClienteId(null); setCrmEditErrors({}); }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[11px] font-bold transition border border-slate-200">Cancelar</button>
                                  </>
                                ) : (
                                  <>
                                     {puedeEscribir && (
                                     <button onClick={() => {
                                         setClienteNombre(c.nombre);
                                         setClienteNif(c.nif);
                                         setClienteDireccion(c.direccion);
                                         setShowCRMModal(false);
                                     }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[11px] font-bold transition shadow-sm">Usar en Factura</button>
                                     )}
                                     {puedeEscribir && (
                                     <>
                                     <button onClick={() => { setEditandoClienteId(c.id); setEditCRMData({ nombre: c.nombre, nif: c.nif, direccion: c.direccion, email: c.email || '', telefono: c.telefono || '' }); setCrmEditErrors({}); }} className="bg-slate-50 hover:bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[11px] font-bold transition border border-slate-200 hover:border-blue-200">Editar</button>
                                     <button onClick={() => setCrmIdToDelete(c.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[11px] font-bold transition border border-rose-100">Borrar</button>
                                     </>
                                     )}
                                  </>
                               )}
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        )}

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