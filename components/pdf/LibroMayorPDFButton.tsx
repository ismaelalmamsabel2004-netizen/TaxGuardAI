"use client";

// 🚀 RENDIMIENTO: @react-pdf/renderer es una librería pesada (motor de maquetación PDF completo)
// que solo hace falta cuando el usuario pulsa "Descargar PDF". Aislarla en su propio chunk y
// cargarla con next/dynamic (ssr:false) evita que viaje dentro del JS principal de la Consola
// General, acelerando la primera carga de la página más visitada de la app.
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const pdfStyles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Roboto' },
  header: { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 15, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginTop: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 5, alignItems: 'center' },
  colFecha: { width: '15%', fontSize: 9, color: '#475569' },
  colCat: { width: '30%', fontSize: 9, fontWeight: 700, color: '#334155' },
  colProy: { width: '15%', fontSize: 9, color: '#8b5cf6', fontWeight: 700 },
  colImporte: { width: '15%', fontSize: 9, textAlign: 'right', fontWeight: 700 },
  colIva: { width: '10%', fontSize: 9, textAlign: 'right', color: '#64748b' },
  colTotal: { width: '15%', fontSize: 9, textAlign: 'right', fontWeight: 700, color: '#0f172a' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

const LibroMayorPDF = ({ datos, empresaId, filtro }: any) => {
  const nombreLimpio = empresaId.startsWith("CLIENTE|") ? empresaId.split('|')[2] : empresaId;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Libro Mayor - {nombreLimpio}</Text>
          <Text style={pdfStyles.subtitle}>Extracto de operaciones. Filtro aplicado: {filtro}</Text>
          <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>Fecha de emisión: {new Date().toLocaleDateString('es-ES')}</Text>
        </View>

        <View style={pdfStyles.tableHeader}>
          <Text style={pdfStyles.colFecha}>FECHA</Text>
          <Text style={pdfStyles.colCat}>CATEGORÍA / DOC.</Text>
          <Text style={pdfStyles.colProy}>PROYECTO</Text>
          <Text style={pdfStyles.colImporte}>BASE IMP.</Text>
          <Text style={pdfStyles.colIva}>IVA</Text>
          <Text style={pdfStyles.colTotal}>TOTAL</Text>
        </View>

        {datos.map((item: any, i: number) => {
          const isGasto = Number(item.total) < 0;
          const baseNum = Math.abs(Number(item.total));
          const ivaNum = Number(item.iva) || 0;
          const totalOperacion = baseNum * (1 + ivaNum / 100);

          const importeText = `${baseNum.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €`;
          const totalText = `${isGasto ? '-' : '+'}${totalOperacion.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €`;
          const colorImporte = isGasto ? '#e11d48' : '#10b981';
          const matchProy = item.concepto_detalle?.match(/\[PROYECTO:\s*(.*?)\]/);
          const proyText = matchProy ? matchProy[1] : "-";

          return (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colFecha}>{item.name}</Text>
              <Text style={pdfStyles.colCat}>
                {item.categoria || 'General'} {item.numero_factura ? `(${item.numero_factura})` : ''}
              </Text>
              <Text style={pdfStyles.colProy}>{proyText}</Text>
              <Text style={pdfStyles.colImporte}>{importeText}</Text>
              <Text style={pdfStyles.colIva}>{item.iva === 0 || item.iva === "0" ? "Exento" : `${item.iva}%`}</Text>
              <Text style={[pdfStyles.colTotal, { color: colorImporte }]}>{totalText}</Text>
            </View>
          );
        })}

        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>Generado mediante TaxGuard AI</Text>
          <Text style={pdfStyles.footerText}>SaaS Financiero B2B</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function LibroMayorPDFButton({ datos, empresaId, filtro, fileName }: { datos: any[]; empresaId: string; filtro: string; fileName: string }) {
  return (
    <PDFDownloadLink
      document={<LibroMayorPDF datos={datos} empresaId={empresaId} filtro={filtro} />}
      fileName={fileName}
    >
      {/* @ts-ignore */}
      {({ loading }) => (
        <button disabled={loading} className="flex-1 sm:flex-none flex justify-center items-center gap-2 text-xs font-bold bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 border border-blue-200 shadow-sm transition whitespace-nowrap disabled:opacity-50">
            {loading ? '⏳...' : '📄 PDF'}
          </button>
      )}
    </PDFDownloadLink>
  );
}
