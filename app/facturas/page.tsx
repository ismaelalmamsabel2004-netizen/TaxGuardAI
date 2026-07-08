"use client";

import { useState, useEffect } from "react";
import { UserButton, Show } from "@clerk/nextjs";
import Link from 'next/link';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Roboto', backgroundColor: '#ffffff' },
  header: { borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 20, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 5 },
  section: { marginBottom: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, color: '#475569', fontWeight: 700 },
  value: { fontSize: 11, color: '#0f172a' },
  totalBox: { marginTop: 20, padding: 20, backgroundColor: '#eff6ff', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: 700, color: '#1e3a8a' },
  totalValue: { fontSize: 20, fontWeight: 700, color: '#2563eb' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 9, color: '#94a3b8', textAlign: 'center' }
});

const FacturaPDF = ({ datos }: { datos: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{datos.miEmpresa.toUpperCase()}</Text>
        <Text style={styles.subtitle}>FACTURA OFICIAL | {datos.numeroFactura}</Text>
      </View>
      <View style={styles.section}>
        <View style={styles.row}><Text style={styles.label}>Cliente:</Text><Text style={styles.value}>{datos.clienteNombre}</Text></View>
        <View style={styles.row}><Text style={styles.label}>NIF:</Text><Text style={styles.value}>{datos.clienteNif}</Text></View>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Concepto: {datos.concepto}</Text>
        <View style={styles.row}><Text style={styles.value}>Base Imponible:</Text><Text style={styles.value}>{datos.baseImponible} €</Text></View>
        <View style={styles.row}><Text style={styles.value}>IVA ({datos.ivaSeleccionado}%):</Text><Text style={styles.value}>{datos.cuotaIva.toFixed(2)} €</Text></View>
      </View>
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
        <Text style={styles.totalValue}>{datos.totalFinal.toFixed(2)} €</Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>Generado por TaxGuard AI</Text></View>
    </Page>
  </Document>
);

export default function GeneradorFacturas() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [baseImponible, setBaseImponible] = useState("");
  const [ivaSeleccionado, setIvaSeleccionado] = useState("21");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [concepto, setConcepto] = useState("");
  const [numeroFactura, setNumeroFactura] = useState(`F-${new Date().getFullYear()}-001`);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setIsMounted(true);
    const guardadas = localStorage.getItem('taxguard_empresas');
    setEmpresas(guardadas ? JSON.parse(guardadas) : ["Alperez"]);
    setEmpresaId(localStorage.getItem('taxguard_empresaActiva') || "Alperez");
  }, []);

  if (!isMounted) return null;

  const baseNum = parseFloat(baseImponible.replace(',', '.')) || 0;
  const cuotaIva = baseNum * (Number(ivaSeleccionado) / 100);
  const totalFinal = baseNum + cuotaIva;

  const datosPDF = { miEmpresa: empresaId, numeroFactura, fecha, clienteNombre, clienteNif, concepto, baseImponible: baseNum.toFixed(2), ivaSeleccionado, cuotaIva, totalFinal };

  return (
    <Show when="signed-in">
      <div className="flex min-h-screen bg-[#F4F5F7] font-sans relative" translate="no">
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 p-6 transition-transform duration-300`}>
             <button className="lg:hidden absolute top-4 right-4 text-white" onClick={() => setIsSidebarOpen(false)}>X</button>
             <nav className="space-y-4 mt-10">
                <Link href="/" className="block p-4 text-white hover:bg-slate-800 rounded-xl">Consola</Link>
                <Link href="/facturas" className="block p-4 bg-blue-600 text-white rounded-xl font-bold">Facturación PDF</Link>
             </nav>
        </aside>
        <main className="flex-1 p-6 pt-20 lg:p-10 w-full">
            <button className="lg:hidden mb-4" onClick={() => setIsSidebarOpen(true)}>☰ Menú</button>
            <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <h1 className="text-2xl font-black mb-6">Crear Factura Premium</h1>
                <div className="grid gap-4">
                    <input type="text" placeholder="Cliente" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="w-full p-4 border rounded-xl" />
                    <input type="number" placeholder="Base Imponible" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} className="w-full p-4 border rounded-xl" />
                    <PDFDownloadLink document={<FacturaPDF datos={datosPDF} />} fileName="factura.pdf">
                        <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold">Descargar Factura Profesional</button>
                    </PDFDownloadLink>
                </div>
            </div>
        </main>
      </div>
    </Show>
  );
}