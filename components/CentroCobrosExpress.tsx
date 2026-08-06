"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

export type ContactoCobro = {
  nombre: string;
  nif?: string | null;
  email?: string | null;
  telefono?: string | null;
};

type Urgencia = "vencida" | "urgente" | "ok";

type ItemEnriquecido = {
  item: any;
  totalConIva: number;
  esGasto: boolean;
  fechaLimiteMs: number;
  diasRestantes: number;
  urgencia: Urgencia;
  contacto?: ContactoCobro;
};

function parseFechaEmisionMs(name: string): number {
  if (!name?.includes("/")) return NaN;
  const [d, m, y] = name.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
}

function resolverFechaLimiteMs(item: any): number {
  if (item.raw_fecha_vencimiento) {
    const t = new Date(item.raw_fecha_vencimiento).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (item.fecha_vencimiento && String(item.fecha_vencimiento).includes("/")) {
    const [d, m, y] = String(item.fecha_vencimiento).split("/");
    const t = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    if (Number.isFinite(t)) return t;
  }
  const emision = parseFechaEmisionMs(item.name);
  if (Number.isFinite(emision)) return emision + 30 * 24 * 3600 * 1000;
  return NaN;
}

function matchContacto(item: any, contactos: ContactoCobro[]): ContactoCobro | undefined {
  const nombre = (item.cliente_nombre || "").trim().toLowerCase();
  const nif = (item.cliente_nif || item.cif || "").trim().toUpperCase();
  if (nif) {
    const byNif = contactos.find((c) => (c.nif || "").trim().toUpperCase() === nif);
    if (byNif) return byNif;
  }
  if (nombre) {
    return contactos.find((c) => c.nombre.trim().toLowerCase() === nombre);
  }
  return undefined;
}

function formatearEur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function limpiarTelefonoWhatsApp(tel: string) {
  const digits = tel.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 9) return `34${digits}`;
  return digits;
}

function construirMensajeReclamacion(opts: {
  item: any;
  totalConIva: number;
  diasRestantes: number;
  nombreEmpresa: string;
  miNif?: string;
}) {
  const { item, totalConIva, diasRestantes, nombreEmpresa, miNif } = opts;
  const cliente = item.cliente_nombre || "cliente";
  const num = item.numero_factura || "S/N";
  const vencida = diasRestantes < 0;
  const diasTxt = vencida
    ? `lleva ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? "" : "s"} de retraso`
    : diasRestantes === 0
      ? "vence hoy"
      : `vence en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`;

  return (
    `Estimado/a ${cliente},\n\n` +
    `Le recordamos amablemente que la factura ${num} emitida el ${item.name} ` +
    `por importe de ${formatearEur(totalConIva)} € (IVA incluido) ${diasTxt}.\n\n` +
    `Agradeceríamos la confirmación del pago a la mayor brevedad posible.\n\n` +
    `Quedamos a su disposición para cualquier aclaración.\n\n` +
    `Un saludo,\n${nombreEmpresa}` +
    (miNif ? `\nNIF/CIF: ${miNif}` : "")
  );
}

type Props = {
  pendientes: any[];
  contactosCRM: ContactoCobro[];
  puedeEscribir: boolean;
  nombreEmpresa: string;
  miNif?: string;
  onMarcarPagado: (id: any) => void | Promise<void>;
  onPosponerVencimiento?: (id: any, nuevaFechaISO: string) => void | Promise<void>;
};

export default function CentroCobrosExpress({
  pendientes,
  contactosCRM,
  puedeEscribir,
  nombreEmpresa,
  miNif,
  onMarcarPagado,
  onPosponerVencimiento,
}: Props) {
  const [filtro, setFiltro] = useState<"todos" | "cobros" | "pagos" | "vencidas">("todos");

  const enriquecidos = useMemo(() => {
    const ahora = Date.now();
    const lista: ItemEnriquecido[] = pendientes.map((item) => {
      const totalConIva = Math.abs(Number(item.total)) * (1 + (Number(item.iva) || 0) / 100);
      const esGasto = Number(item.total) < 0;
      const fechaLimiteMs = resolverFechaLimiteMs(item);
      const diasRestantes = Number.isFinite(fechaLimiteMs)
        ? Math.ceil((fechaLimiteMs - ahora) / (1000 * 60 * 60 * 24))
        : 999;
      let urgencia: Urgencia = "ok";
      if (diasRestantes < 0) urgencia = "vencida";
      else if (diasRestantes <= 7) urgencia = "urgente";
      return {
        item,
        totalConIva,
        esGasto,
        fechaLimiteMs,
        diasRestantes,
        urgencia,
        contacto: matchContacto(item, contactosCRM),
      };
    });

    return lista.sort((a, b) => {
      const rank = { vencida: 0, urgente: 1, ok: 2 };
      if (rank[a.urgencia] !== rank[b.urgencia]) return rank[a.urgencia] - rank[b.urgencia];
      return a.diasRestantes - b.diasRestantes;
    });
  }, [pendientes, contactosCRM]);

  const visibles = useMemo(() => {
    return enriquecidos.filter((e) => {
      if (filtro === "cobros" && e.esGasto) return false;
      if (filtro === "pagos" && !e.esGasto) return false;
      if (filtro === "vencidas" && e.urgencia !== "vencida") return false;
      return true;
    });
  }, [enriquecidos, filtro]);

  const totalCobrar = enriquecidos.filter((e) => !e.esGasto).reduce((s, e) => s + e.totalConIva, 0);
  const totalPagar = enriquecidos.filter((e) => e.esGasto).reduce((s, e) => s + e.totalConIva, 0);
  const totalVencido = enriquecidos.filter((e) => e.urgencia === "vencida").reduce((s, e) => s + e.totalConIva, 0);
  const numVencidas = enriquecidos.filter((e) => e.urgencia === "vencida").length;

  const copiarInforme = async () => {
    const lineas = [
      `INFORME DE COBROS — ${nombreEmpresa}`,
      `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      "",
      `A cobrar: ${formatearEur(totalCobrar)} €`,
      `A pagar: ${formatearEur(totalPagar)} €`,
      `Vencido: ${formatearEur(totalVencido)} € (${numVencidas} documento${numVencidas === 1 ? "" : "s"})`,
      "",
      "Detalle:",
      ...enriquecidos.map((e) => {
        const tipo = e.esGasto ? "PAGO" : "COBRO";
        const urg =
          e.urgencia === "vencida"
            ? `VENCIDA ${Math.abs(e.diasRestantes)}d`
            : e.urgencia === "urgente"
              ? `vence en ${e.diasRestantes}d`
              : `vence en ${e.diasRestantes}d`;
        return `- [${tipo}] ${e.item.numero_factura || "S/N"} · ${e.item.cliente_nombre || e.item.cif || "—"} · ${formatearEur(e.totalConIva)} € · ${urg}`;
      }),
      "",
      "Generado con TaxGuard AI",
    ];
    try {
      await navigator.clipboard.writeText(lineas.join("\n"));
      toast.success("Informe copiado", { description: "Pégalo en WhatsApp, email o Notion." });
    } catch {
      toast.error("No se pudo copiar", { description: "Prueba de nuevo o copia manualmente." });
    }
  };

  const reclamarEmail = (e: ItemEnriquecido) => {
    if (e.esGasto) {
      toast.info("Solo cobros", { description: "La reclamación por email es para facturas a cobrar." });
      return;
    }
    const email = e.contacto?.email?.trim();
    if (!email) {
      toast.warning("Sin email en el CRM", {
        description: "Añade el email del cliente en Facturación → Agenda CRM para reclamar en 1 clic.",
      });
      return;
    }
    const cuerpo = construirMensajeReclamacion({
      item: e.item,
      totalConIva: e.totalConIva,
      diasRestantes: e.diasRestantes,
      nombreEmpresa,
      miNif,
    });
    const asunto = `Recordatorio de pago — Factura ${e.item.numero_factura || "pendiente"} — ${nombreEmpresa}`;
    window.open(
      `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`,
      "_blank",
    );
  };

  const reclamarWhatsApp = (e: ItemEnriquecido) => {
    if (e.esGasto) return;
    const tel = e.contacto?.telefono?.trim();
    if (!tel) {
      toast.warning("Sin teléfono en el CRM", {
        description: "Añade el móvil del cliente en la Agenda CRM para abrir WhatsApp.",
      });
      return;
    }
    const msg = construirMensajeReclamacion({
      item: e.item,
      totalConIva: e.totalConIva,
      diasRestantes: e.diasRestantes,
      nombreEmpresa,
      miNif,
    });
    const wa = limpiarTelefonoWhatsApp(tel);
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const copiarMensaje = async (e: ItemEnriquecido) => {
    const msg = construirMensajeReclamacion({
      item: e.item,
      totalConIva: e.totalConIva,
      diasRestantes: e.diasRestantes,
      nombreEmpresa,
      miNif,
    });
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Mensaje copiado", { description: "Listo para pegar en tu canal favorito." });
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const posponer = async (e: ItemEnriquecido) => {
    if (!onPosponerVencimiento) return;
    const base = Number.isFinite(e.fechaLimiteMs) ? e.fechaLimiteMs : Date.now();
    const nueva = new Date(Math.max(base, Date.now()) + 7 * 24 * 3600 * 1000);
    await onPosponerVencimiento(e.item.id, nueva.toISOString());
  };

  if (pendientes.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-rose-50/40 border border-amber-200 p-5 md:p-6 rounded-2xl mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl bg-amber-100 p-2.5 rounded-xl border border-amber-200">💸</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-widest">Centro de Cobros Express</h3>
              <span className="text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-full">
                Killer Feature
              </span>
            </div>
            <p className="text-xs font-medium text-amber-800/80 mt-1">
              {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"} · priorizados por urgencia · reclamación en 1 clic
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copiarInforme}
            className="text-[10px] font-black uppercase tracking-wider bg-white border border-amber-200 text-amber-900 px-3 py-2 rounded-xl hover:bg-amber-50 transition shadow-sm"
          >
            📋 Copiar informe
          </button>
          <div className="flex bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm">
            {(
              [
                { id: "todos" as const, label: "Todos" },
                { id: "cobros" as const, label: "A cobrar" },
                { id: "pagos" as const, label: "A pagar" },
                { id: "vencidas" as const, label: "Vencidas" },
              ]
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-2 text-[10px] font-bold transition ${
                  filtro === f.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white/90 border border-emerald-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A cobrar</p>
          <p className="text-xl font-black text-emerald-600 mt-1">+{formatearEur(totalCobrar)} €</p>
        </div>
        <div className="bg-white/90 border border-rose-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A pagar</p>
          <p className="text-xl font-black text-rose-600 mt-1">-{formatearEur(totalPagar)} €</p>
        </div>
        <div className="bg-white/90 border border-amber-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencido (riesgo)</p>
          <p className="text-xl font-black text-amber-700 mt-1">{formatearEur(totalVencido)} €</p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{numVencidas} documento{numVencidas === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-amber-100 shadow-sm">
        <table className="min-w-full text-left whitespace-nowrap text-sm">
          <thead className="bg-amber-50/80 text-[10px] font-black text-amber-800 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Urgencia</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Cliente / proveedor</th>
              <th className="px-4 py-3 text-right">Importe</th>
              {puedeEscribir && <th className="px-4 py-3 text-right">Acciones Express</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50 font-semibold text-slate-700">
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                  No hay documentos en este filtro.
                </td>
              </tr>
            ) : (
              visibles.map((e) => {
                const badge =
                  e.urgencia === "vencida"
                    ? "bg-rose-100 text-rose-700 border-rose-200"
                    : e.urgencia === "urgente"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200";
                const badgeTxt =
                  e.urgencia === "vencida"
                    ? `🔴 Vencida ${Math.abs(e.diasRestantes)}d`
                    : e.urgencia === "urgente"
                      ? `⏳ ${e.diasRestantes}d`
                      : `✓ ${e.diasRestantes}d`;

                return (
                  <tr key={e.item.id} className="hover:bg-amber-50/40 transition">
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${badge}`}>
                        {badgeTxt}
                      </span>
                      {Number.isFinite(e.fechaLimiteMs) && (
                        <span className="block text-[9px] text-slate-400 font-medium mt-1">
                          Vence: {new Date(e.fechaLimiteMs).toLocaleDateString("es-ES")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-black text-slate-900">{e.item.numero_factura || "S/N"}</span>
                      <span className="text-[10px] text-slate-400">Emisión {e.item.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-bold text-slate-900">
                        {e.item.cliente_nombre || e.item.cif || "Sin asignar"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {e.item.cif || e.item.cliente_nif || "—"}
                        {e.contacto?.email ? ` · ${e.contacto.email}` : ""}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-black ${e.esGasto ? "text-rose-600" : "text-emerald-600"}`}>
                      {e.esGasto ? "-" : "+"}
                      {formatearEur(e.totalConIva)} €
                    </td>
                    {puedeEscribir && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onMarcarPagado(e.item.id)}
                            className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg transition shadow-sm ${
                              e.esGasto
                                ? "bg-rose-600 text-white hover:bg-rose-500"
                                : "bg-emerald-600 text-white hover:bg-emerald-500"
                            }`}
                          >
                            {e.esGasto ? "Pagar" : "Cobrar"}
                          </button>
                          {!e.esGasto && (
                            <>
                              <button
                                type="button"
                                onClick={() => reclamarEmail(e)}
                                className="text-[9px] font-black px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                                title="Abrir email de reclamación"
                              >
                                ✉️ Reclamar
                              </button>
                              <button
                                type="button"
                                onClick={() => reclamarWhatsApp(e)}
                                className="text-[9px] font-black px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                                title="Abrir WhatsApp"
                              >
                                WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => copiarMensaje(e)}
                                className="text-[9px] font-black px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
                                title="Copiar mensaje"
                              >
                                Copiar
                              </button>
                            </>
                          )}
                          {onPosponerVencimiento && (
                            <button
                              type="button"
                              onClick={() => posponer(e)}
                              className="text-[9px] font-black px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                              title="Aplazar vencimiento 7 días"
                            >
                              +7 días
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-amber-800/70 font-medium mt-3">
        Tip: si el cliente tiene email o teléfono en la Agenda CRM, «Reclamar» y WhatsApp se rellenan solos con un mensaje profesional.
      </p>
    </div>
  );
}
