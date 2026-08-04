"use client";

// 🚀 RENDIMIENTO: @react-pdf/renderer es una librería pesada (motor de maquetación PDF completo)
// que solo hace falta cuando el usuario quiere descargar una factura/presupuesto. Aislarla en su
// propio chunk y cargarla con next/dynamic (ssr:false) evita que viaje dentro del JS principal de
// la página de Facturación, acelerando la primera carga.
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, Image } from '@react-pdf/renderer';
import type { ReactNode } from 'react';

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
  page: { backgroundColor: '#ffffff', padding: 50, fontFamily: 'Roboto' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 30, borderBottomWidth: 2, borderBottomColor: '#2563eb', marginBottom: 40 },
  headerContainerPresupuesto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 30, borderBottomWidth: 2, borderBottomColor: '#f59e0b', marginBottom: 40 },
  logoSection: { flexDirection: 'column', maxWidth: '60%' },
  logoImage: { width: 140, height: 60, objectFit: 'contain', marginBottom: 8 },
  logoText: { fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5, marginBottom: 4 },
  logoSub: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  invoiceInfoBox: { alignItems: 'flex-end' },
  invoiceBadge: { backgroundColor: '#eff6ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, marginBottom: 8 },
  presupuestoBadge: { backgroundColor: '#fffbeb', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, marginBottom: 8 },
  invoiceBadgeText: { color: '#2563eb', fontSize: 14, fontWeight: 700, letterSpacing: 1 },
  presupuestoBadgeText: { color: '#d97706', fontSize: 14, fontWeight: 700, letterSpacing: 1 },
  invoiceDetailsText: { fontSize: 10, color: '#475569', marginBottom: 4 },
  invoiceDetailsBold: { fontWeight: 700, color: '#0f172a' },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  infoColumn: { width: '45%', flexDirection: 'column' },
  infoLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 },
  infoName: { fontSize: 12, color: '#0f172a', fontWeight: 700, marginBottom: 4 },
  infoText: { fontSize: 10, color: '#475569', marginBottom: 3, lineHeight: 1.4 },
  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderCell: { paddingVertical: 10, paddingHorizontal: 4, fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { paddingVertical: 12, paddingHorizontal: 4, fontSize: 10, color: '#334155', lineHeight: 1.4 },
  colCant: { width: '8%', textAlign: 'center' },
  colConcepto: { width: '38%' },
  colPrecio: { width: '15%', textAlign: 'right' },
  colBase: { width: '15%', textAlign: 'right' },
  colIva: { width: '9%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  bottomSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  paymentWrapper: { width: '40%' },
  paymentBox: { padding: 15, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  paymentBoxPresupuesto: { padding: 15, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  paymentTitle: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 },
  paymentText: { fontSize: 10, color: '#0f172a', fontWeight: 500, marginBottom: 4 },
  totalsWrapper: { width: '55%' },
  totalsBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValue: { fontSize: 11, color: '#0f172a', fontWeight: 500 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  grandTotalLabel: { fontSize: 12, color: '#0f172a', fontWeight: 700, textTransform: 'uppercase' },
  grandTotalValue: { fontSize: 16, color: '#2563eb', fontWeight: 700 },
  grandTotalValuePresupuesto: { fontSize: 16, color: '#d97706', fontWeight: 700 },
  footer: { position: 'absolute', bottom: 40, left: 50, right: 50, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94a3b8' },
  footerBrand: { fontSize: 8, color: '#3b82f6', fontWeight: 700 }
});

const FacturaPDF = ({ datos }: { datos: any }) => {
  const isPresupuesto = datos.modo === 'presupuesto';
  const isRectificativa = datos.numeroDocumento && datos.numeroDocumento.startsWith('R-');

  const docTypeLabel = isPresupuesto ? 'PRESUPUESTO' : (isRectificativa ? 'FACTURA RECTIFICATIVA' : 'FACTURA');
  const mainColor = isPresupuesto ? '#d97706' : (isRectificativa ? '#e11d48' : '#2563eb');
  const badgeBg = isPresupuesto ? '#fffbeb' : (isRectificativa ? '#ffe4e6' : '#eff6ff');

  const sign = isRectificativa ? -1 : 1;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerContainer, { borderBottomColor: mainColor }]}>
          <View style={styles.logoSection}>
            {datos.logo && (
               <Image src={{ uri: datos.logo, method: 'GET', headers: { 'Cache-Control': 'no-cache' }, body: '' }} style={styles.logoImage} />
            )}
            <Text style={styles.logoText}>{datos.miEmpresa.toUpperCase()}</Text>
            <Text style={styles.logoSub}>{isPresupuesto ? 'Propuesta Comercial' : 'Facturación Electrónica'}</Text>
          </View>
          <View style={styles.invoiceInfoBox}>
            <View style={[styles.invoiceBadge, { backgroundColor: badgeBg }]}>
               <Text style={[styles.invoiceBadgeText, { color: mainColor }]}>
                  {docTypeLabel}
               </Text>
            </View>
            <Text style={styles.invoiceDetailsText}>Nº Documento: <Text style={styles.invoiceDetailsBold}>{datos.numeroDocumento}</Text></Text>
            <Text style={styles.invoiceDetailsText}>Fecha Emisión: <Text style={styles.invoiceDetailsBold}>{datos.fecha}</Text></Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Información del Emisor</Text>
            <Text style={styles.infoName}>{datos.miEmpresa}</Text>
            <Text style={styles.infoText}>NIF/CIF: {datos.miNif}</Text>
            <Text style={styles.infoText}>{datos.miDireccion}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>{isPresupuesto ? 'Preparado Para' : 'Facturado A'}</Text>
            <Text style={styles.infoName}>{datos.clienteNombre}</Text>
            <Text style={styles.infoText}>NIF/CIF: {datos.clienteNif}</Text>
            <Text style={styles.infoText}>{datos.clienteDireccion}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colCant]}>CANT</Text>
            <Text style={[styles.tableHeaderCell, styles.colConcepto]}>CONCEPTO</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrecio]}>PRECIO UN.</Text>
            <Text style={[styles.tableHeaderCell, styles.colBase]}>BASE</Text>
            <Text style={[styles.tableHeaderCell, styles.colIva]}>IVA %</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
          </View>
          {datos.lineasFactura.map((linea: any, index: number) => {
            const importe = Number(linea.cantidad) * Number(linea.precio) * sign;
            return (
              <View key={linea.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colCant]}>{linea.cantidad}</Text>
                <Text style={[styles.tableCell, styles.colConcepto]}>{linea.concepto}</Text>
                <Text style={[styles.tableCell, styles.colPrecio]}>{(Number(linea.precio) * sign).toFixed(2)} €</Text>
                <Text style={[styles.tableCell, styles.colBase]}>{importe.toFixed(2)} €</Text>
                <Text style={[styles.tableCell, styles.colIva]}>{datos.ivaSeleccionado}%</Text>
                <Text style={[styles.tableCell, styles.colTotal]}>{(importe * (1 + datos.ivaNum/100)).toFixed(2)} €</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomSection}>
           <View style={styles.paymentWrapper}>
              <View style={[styles.paymentBox, { borderLeftColor: mainColor }]}>
                 <Text style={styles.paymentTitle}>Método de Pago</Text>
                 <Text style={styles.paymentText}>{datos.metodoPago}</Text>
                 {datos.metodoPago === 'Transferencia' && datos.iban && (
                    <Text style={styles.paymentText}>IBAN: {datos.iban}</Text>
                 )}
              </View>
           </View>
           <View style={styles.totalsWrapper}>
             <View style={styles.totalsBox}>
               <View style={styles.totalRow}>
                 <Text style={styles.totalLabel}>Subtotal Operación:</Text>
                 <Text style={styles.totalValue}>{(Number(datos.baseImponible) * sign).toFixed(2)} €</Text>
               </View>
               <View style={styles.totalRow}>
                 <Text style={styles.totalLabel}>Impuestos (IVA {datos.ivaSeleccionado}%):</Text>
                 <Text style={styles.totalValue}>{(Number(datos.cuotaIva) * sign).toFixed(2)} €</Text>
               </View>

               {datos.cuotaIrpf > 0 && (
                   <View style={styles.totalRow}>
                     <Text style={styles.totalLabel}>Retención IRPF (-{datos.irpfSeleccionado}%):</Text>
                     <Text style={{...styles.totalValue, color: '#ef4444'}}>{(Number(datos.cuotaIrpf) * -sign).toFixed(2)} €</Text>
                   </View>
               )}

               <View style={styles.grandTotalRow}>
                 <Text style={styles.grandTotalLabel}>{isPresupuesto ? 'Total Estimado' : 'Total a Pagar'}</Text>
                 <Text style={[styles.grandTotalValue, { color: mainColor }]}>{(Number(datos.totalFinal) * sign).toFixed(2)} €</Text>
               </View>
             </View>
           </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isPresupuesto
              ? 'Documento informativo de valoración económica. Este presupuesto no tiene validez como factura fiscal.'
              : 'Documento fiscal válido. Este documento acredita la prestación de servicios detallada.'}
          </Text>
          <Text style={styles.footerBrand}>Generado de forma segura mediante TaxGuard AI</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function FacturaPDFButton({ datos, fileName, children }: { datos: any; fileName: string; children: (loading: boolean) => ReactNode }) {
  return (
    <PDFDownloadLink document={<FacturaPDF datos={datos} />} fileName={fileName}>
      {/* @ts-ignore */}
      {({ loading }: { loading: boolean }) => children(loading)}
    </PDFDownloadLink>
  );
}
