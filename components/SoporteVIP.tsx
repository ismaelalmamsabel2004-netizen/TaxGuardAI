"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export type FaqItem = { q: string; a: string; categoria: string };

const EMAIL_SOPORTE = "soporte.taxguard@gmail.com";

const FAQS_COMUNES: FaqItem[] = [
  { categoria: "Empezar", q: "🚀 ¿Cómo empiezo a usar TaxGuard AI?", a: "1) Elige o crea tu Espacio de Trabajo. 2) Pulsa ⚙️ y completa sector, categorías y datos fiscales. 3) Registra tu primer movimiento (manual, OCR o CSV bancario). 4) Revisa el Escudo Fiscal y el Libro Mayor. En 10 minutos ya tienes el pulso de tu caja." },
  { categoria: "Empezar", q: "👥 ¿Puedo dar acceso a mi gestor/asesor?", a: "Sí. En Consola General, pulsa el botón 👥 junto al espacio, invita su email y tendrá acceso en Solo Lectura: ve números y descarga reportes, pero no puede editar ni borrar facturas." },
  { categoria: "OCR", q: "📸 ¿Cómo funciona el escáner OCR de facturas?", a: "En Consola General → «Factura OCR». Sube foto o PDF (máx. 10MB). La IA rellena fecha, base, IVA, NIF y número. Revisa la confianza y guarda. El adjunto queda vinculado al movimiento." },
  { categoria: "OCR", q: "📊 ¿Cómo importo el extracto del banco?", a: "En Consola → «Banco (CSV)». Sube el CSV de tu banco: TaxGuard clasifica movimientos y los mete en el Libro Mayor. Revisa duplicados antes de dar por buena la importación." },
  { categoria: "Tesorería", q: "🚨 ¿Qué es el Radar de Morosidad?", a: "Es el control de facturas emitidas pendientes de cobro. Marca «Cobrar» cuando te paguen. Si pasan +30 días (o la fecha de vencimiento), aparece como Vencida para que no se te escape la liquidez." },
  { categoria: "Tesorería", q: "🔄 ¿Cómo funcionan los gastos/ingresos recurrentes?", a: "Al guardar un movimiento, márcalo como recurrente (Mensual/Trimestral…). En cada visita, TaxGuard genera automáticamente los que tocaba registrar desde la última vez." },
  { categoria: "Facturas", q: "📝 ¿Cómo emito una factura PDF oficial?", a: "Ve a Facturación PDF, rellena tus datos (guárdalos como predeterminados), cliente y líneas. Pulsa «Registrar en Libro Mayor» y descarga el PDF. La numeración F-AAAA-XXX se gestiona sola." },
  { categoria: "Facturas", q: "❌ Me equivoqué en una factura. ¿La borro?", a: "No borres facturas ya emitidas: la numeración es legal. Usa «Rectificar» para crear un Abono (R-…) en negativo que anula el documento ante Hacienda." },
  { categoria: "Facturas", q: "🪄 ¿Presupuesto o Factura?", a: "El presupuesto (P-) es una propuesta: no suma en ingresos ni en impuestos. Cuando el cliente acepte, pulsa «Convertir» en el historial para generar la factura oficial." },
  { categoria: "Impuestos", q: "🏛️ ¿Los borradores sirven para la AEAT?", a: "Son borradores orientativos con casillas alineadas al modelo ([01], [03]…). Revísalos con tu asesor antes de presentarlos. TaxGuard no sustituye la declaración oficial ni la firma electrónica." },
  { categoria: "Impuestos", q: "🏢 ¿Diferencia entre modelo 115 y 111?", a: "115 = retenciones de alquiler (19%). 111 = retenciones a profesionales/asesores (15%). TaxGuard los separa según la categoría del gasto." },
  { categoria: "Impuestos", q: "📋 ¿Para qué sirve el 347?", a: "Declara clientes/proveedores con más de 3.005,06 € anuales. TaxGuard suma las facturas del año y te los agrupa automáticamente." },
  { categoria: "Análisis", q: "🧠 ¿Qué hace el Centro de Inteligencia?", a: "Tu CFO virtual: analiza el periodo, detecta riesgos de caja, simula precios y proyecta 30/60/90 días a partir de tu histórico y recurrentes." },
  { categoria: "Análisis", q: "📈 ¿Cómo se calcula el Runway?", a: "Estima cuántos meses podrías aguantar sin nuevos ingresos, según tus gastos medios y el dinero libre de la provisión de Hacienda." },
  { categoria: "CRM", q: "📇 ¿Cómo uso la Agenda CRM?", a: "En Facturación PDF abre «Agenda CRM». Guarda clientes y proveedores (NIF, email, IBAN). Al facturar se autocompletan. La Ficha 360° muestra facturado, pendiente y vencido por contacto." },
];

const FAQS_MODULO: Record<string, FaqItem[]> = {
  consola: [
    { categoria: "Consola", q: "🛡️ ¿Qué es el Escudo Fiscal Integrado?", a: "Resume IVA cobrado, IVA pagado y la liquidación estimada del periodo filtrado. Úsalo junto a Modelos Tributarios para anticipar lo que tendrás que pagar o que te devolverán." },
    { categoria: "Consola", q: "🎯 ¿Cómo funciona la Meta del Mes?", a: "Define tu objetivo de ingresos en el panel. La barra te muestra el avance del mes en curso para mantener el foco comercial sin salir de la Consola." },
    { categoria: "Consola", q: "📎 ¿Dónde veo el documento adjunto de un gasto?", a: "En el Libro Mayor, si hay adjunto aparece la etiqueta «Doc». Ábrelo para auditar el ticket/PDF original vinculado al movimiento." },
  ],
  analisis: [
    { categoria: "Análisis", q: "🔮 ¿La proyección 30/90 es exacta?", a: "Es determinista sobre tu histórico y recurrentes. Sirve para anticipar tensión de caja; no sustituye un presupuesto formal ni un plan de tesorería bancario." },
    { categoria: "Análisis", q: "💰 ¿La Hucha de Hacienda es exacta?", a: "Es una provisión orientativa (IVA + IRPF estimado). Reserva ese importe: no es beneficio disponible." },
  ],
  impuestos: [
    { categoria: "Impuestos", q: "🧾 ¿Qué gastos coge el modelo 130?", a: "Acumula ingresos y gastos (sin IVA) desde enero hasta el trimestre seleccionado para calcular el rendimiento neto del periodo." },
  ],
  facturas: [
    { categoria: "Facturas", q: "💰 ¿Cómo marco una factura como cobrada?", a: "En el historial pulsa «Cobrar». El estado usa el mismo campo que Consola y Documentos. Puedes revertirlo con «Pendiente»." },
  ],
  documentos: [
    { categoria: "Documentos", q: "📁 ¿Para qué sirve el Gestor Documental?", a: "Centraliza adjuntos y el seguimiento de cobros/pagos. Desde aquí controlas qué documentos tienes y el estado de tesorería asociado." },
  ],
};

const CATEGORIAS = ["Todas", "Empezar", "OCR", "Tesorería", "Facturas", "Impuestos", "Análisis", "CRM", "Consola", "Documentos"] as const;

const ATAJOS = [
  { href: "/", label: "Consola", desc: "OCR, Libro Mayor, IVA" },
  { href: "/facturas", label: "Facturas", desc: "PDF y CRM" },
  { href: "/impuestos", label: "Impuestos", desc: "303, 130, 347…" },
  { href: "/analisis", label: "Análisis", desc: "CFO y proyección" },
  { href: "/documentos", label: "Documentos", desc: "Archivo y cobros" },
];

const CHECKLIST = [
  { href: "/", text: "Configura tu espacio (⚙️ categorías y datos fiscales)" },
  { href: "/", text: "Registra el primer gasto con OCR o CSV bancario" },
  { href: "/facturas", text: "Emite tu primera factura PDF y guárdala en el Libro Mayor" },
  { href: "/impuestos", text: "Revisa el borrador del trimestre actual" },
  { href: "/analisis", text: "Pide un diagnóstico al Centro de Inteligencia" },
];

type Modulo = keyof typeof FAQS_MODULO | "general";

type SoporteVIPModalProps = {
  open: boolean;
  onClose: () => void;
  empresaId?: string;
  modulo?: Modulo;
};

export function SoporteVIPNavButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-4 mt-4 border-t border-slate-800">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition group"
      >
        <span className="text-lg group-hover:scale-110 transition-transform">🎧</span>
        <span className="flex flex-col items-start">
          <span className="text-sm font-medium">Soporte VIP</span>
          <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-wider">Ayuda · FAQ · Contacto</span>
        </span>
      </button>
    </div>
  );
}

export default function SoporteVIPModal({ open, onClose, empresaId = "", modulo = "general" }: SoporteVIPModalProps) {
  const [faqSearch, setFaqSearch] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Todas");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setFaqSearch("");
      setCategoria("Todas");
      setOpenFaq(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const faqsBase = useMemo(() => {
    const extra = modulo !== "general" ? (FAQS_MODULO[modulo] || []) : Object.values(FAQS_MODULO).flat();
    const mapa = new Map<string, FaqItem>();
    [...FAQS_COMUNES, ...extra].forEach((f) => {
      if (!mapa.has(f.q)) mapa.set(f.q, f);
    });
    return Array.from(mapa.values());
  }, [modulo]);

  const faqsFiltradas = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return faqsBase.filter((f) => {
      if (categoria !== "Todas" && f.categoria !== categoria) return false;
      if (!q) return true;
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.categoria.toLowerCase().includes(q);
    });
  }, [faqsBase, faqSearch, categoria]);

  const abrirGmailWeb = (tipo: "ayuda" | "sugerencia" | "incidencia") => {
    const espacio = empresaId || "Mi Empresa";
    const asuntos: Record<string, string> = {
      ayuda: `Asistencia Técnica TaxGuard AI - ${espacio}`,
      sugerencia: `Sugerencia de Mejora - TaxGuard AI - ${espacio}`,
      incidencia: `Incidencia Urgente TaxGuard AI - ${espacio}`,
    };
    const cuerpos: Record<string, string> = {
      ayuda: "consulta o problema",
      sugerencia: "idea para mejorar la plataforma",
      incidencia: "descripción del error (qué hacías, captura si puedes)",
    };
    const body = `Hola equipo de TaxGuard AI,%0A%0AEspacio: ${encodeURIComponent(espacio)}%0AMódulo: ${modulo}%0A%0AEscribe aquí tu ${cuerpos[tipo]}:%0A%0A`;
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL_SOPORTE}&su=${encodeURIComponent(asuntos[tipo])}&body=${body}`, "_blank");
  };

  const copiarCorreo = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL_SOPORTE);
      toast.success("Copiado", { description: "Correo de soporte listo para pegar." });
    } catch {
      toast.error("No se pudo copiar", { description: EMAIL_SOPORTE });
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="soporte-vip-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" translate="no">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 gap-4">
          <div>
            <h3 id="soporte-vip-title" className="text-lg font-black text-slate-900 flex items-center gap-2">
              🎧 Centro de Soporte VIP
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Ayuda prioritaria para clientes · Respuesta en menos de 24h laborables
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full">SLA &lt; 24h</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">Base de conocimiento</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">Atajos del producto</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-1" aria-label="Cerrar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto bg-slate-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button type="button" onClick={() => abrirGmailWeb("ayuda")} className="p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition group flex flex-col items-start text-left shadow-sm">
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📨</span>
              <h4 className="text-sm font-black text-blue-900 mb-1">Contactar soporte</h4>
              <p className="text-[11px] text-blue-700 font-medium">Dudas de uso, OCR, impuestos o facturas.</p>
            </button>
            <button type="button" onClick={() => abrirGmailWeb("sugerencia")} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition group flex flex-col items-start text-left shadow-sm">
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">💡</span>
              <h4 className="text-sm font-black text-emerald-900 mb-1">Sugerencias</h4>
              <p className="text-[11px] text-emerald-700 font-medium">Cuéntanos qué función echas en falta.</p>
            </button>
            <button type="button" onClick={() => abrirGmailWeb("incidencia")} className="p-4 bg-rose-50 border border-rose-200 rounded-2xl hover:bg-rose-100 transition group flex flex-col items-start text-left shadow-sm">
              <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🐞</span>
              <h4 className="text-sm font-black text-rose-900 mb-1">Reportar incidencia</h4>
              <p className="text-[11px] text-rose-700 font-medium">Algo no cuadra o ha fallado un guardado.</p>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <button type="button" onClick={copiarCorreo} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copiar {EMAIL_SOPORTE}
            </button>
            <a href={`mailto:${EMAIL_SOPORTE}`} className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-lg hover:bg-blue-100 transition shadow-sm flex items-center justify-center gap-2">
              Abrir app de correo
            </a>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h4 className="text-sm font-black text-slate-800 mb-3">⚡ Atajos rápidos</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ATAJOS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={onClose}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition text-left"
                >
                  <span className="block text-xs font-black text-slate-900">{a.label}</span>
                  <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{a.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
            <h4 className="text-sm font-black text-indigo-900 mb-3">✅ Checklist del primer día</h4>
            <ul className="space-y-2">
              {CHECKLIST.map((item, i) => (
                <li key={i}>
                  <Link href={item.href} onClick={onClose} className="text-xs font-semibold text-indigo-800 hover:text-indigo-600 flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">○</span>
                    <span>{item.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">📚 Base de Conocimiento</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  {faqsFiltradas.length} artículo{faqsFiltradas.length === 1 ? "" : "s"}
                  {faqSearch.trim() ? ` para “${faqSearch.trim()}”` : ""}
                </p>
              </div>
              {/* 🛡️ Texto oscuro forzado: evita input blanco-sobre-blanco heredado del tema */}
              <input
                type="text"
                placeholder="Buscar: OCR, IVA, factura, 303…"
                value={faqSearch}
                onChange={(e) => { setFaqSearch(e.target.value); setOpenFaq(null); }}
                autoComplete="off"
                spellCheck={false}
                className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 caret-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-full sm:w-72"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategoria(c); setOpenFaq(null); }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition ${
                    categoria === c
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {faqsFiltradas.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-slate-500 font-medium">Sin resultados para esa búsqueda.</p>
                  <button
                    type="button"
                    onClick={() => abrirGmailWeb("ayuda")}
                    className="text-xs font-bold bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-500 transition"
                  >
                    Preguntar a soporte por correo
                  </button>
                </div>
              ) : (
                faqsFiltradas.map((faq, idx) => (
                  <div key={`${faq.q}-${idx}`} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 transition gap-3"
                    >
                      <span className="min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded mr-2">
                          {faq.categoria}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{faq.q}</span>
                      </span>
                      <span className={`text-slate-400 transition-transform shrink-0 ${openFaq === idx ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openFaq === idx && (
                      <div className="p-4 pt-0 text-[11px] text-slate-600 leading-relaxed bg-white border-t border-slate-100 font-medium">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[10px] text-center text-slate-400 font-medium pb-1">
            Tip: pulsa Esc para cerrar · El correo incluye automáticamente tu espacio y módulo
          </p>
        </div>
      </div>
    </div>
  );
}
