"use client";

// 🚀 RENDIMIENTO: @react-pdf/renderer es una librería pesada (motor de maquetación PDF completo)
// que solo hace falta cuando el usuario descarga un borrador de modelo fiscal. Aislarla en su
// propio chunk y cargarla con next/dynamic (ssr:false) evita que viaje dentro del JS principal de
// la página de Modelos Tributarios, acelerando la primera carga.
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

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Roboto' },
  headerBox: { borderBottomWidth: 2, paddingBottom: 15, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleBox: { flexDirection: 'column' },
  title: { fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  aeatBox: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  aeatText: { fontSize: 9, fontWeight: 700, color: '#475569' },

  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 15 },
  infoCol: { flexDirection: 'column' },
  infoLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 11, fontWeight: 700, color: '#0f172a' },

  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#ffffff', paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10 },

  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 5 },
  rowLabel: { fontSize: 10, color: '#334155', width: '60%' },

  boxGroup: { flexDirection: 'row', width: '40%', justifyContent: 'flex-end', gap: 15 },
  casillaBox: { flexDirection: 'row', alignItems: 'center', minWidth: '30%', justifyContent: 'flex-end' },
  casillaNum: { fontSize: 8, color: '#94a3b8', marginRight: 4, fontWeight: 700 },
  casillaValue: { fontSize: 10, color: '#0f172a', fontWeight: 700 },

  totalDevengado: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 10, marginTop: 5, marginBottom: 20 },
  totalLabel: { fontSize: 10, fontWeight: 700, color: '#0f172a' },

  resultBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, marginTop: 30, borderLeftWidth: 4 },
  resultLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase' },
  resultValue: { fontSize: 18, fontWeight: 700 },

  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

// PDF DEL MODELO 303 (IVA Trimestral)
const Borrador303PDF = ({ mod303, empresaId, trimestre, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#2563eb' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 303</Text>
          <Text style={{ ...styles.subtitle, color: '#2563eb' }}>Impuesto sobre el Valor Añadido</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Sujeto Pasivo</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Periodo</Text><Text style={styles.infoValue}>{trimestre}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Fecha</Text><Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#334155' }}>LIQUIDACIÓN - IVA DEVENGADO</Text>

      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen general (21%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[01]</Text><Text style={styles.casillaValue}>{mod303.base21.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[02]</Text><Text style={styles.casillaValue}>21%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[03]</Text><Text style={styles.casillaValue}>{mod303.cuota21.toFixed(2)}</Text></View>
        </View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen reducido (10%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[04]</Text><Text style={styles.casillaValue}>{mod303.base10.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[05]</Text><Text style={styles.casillaValue}>10%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[06]</Text><Text style={styles.casillaValue}>{mod303.cuota10.toFixed(2)}</Text></View>
        </View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen superreducido (4%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[07]</Text><Text style={styles.casillaValue}>{mod303.base4.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[08]</Text><Text style={styles.casillaValue}>4%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[09]</Text><Text style={styles.casillaValue}>{mod303.cuota4.toFixed(2)}</Text></View>
        </View>
      </View>

      <View style={styles.totalDevengado}>
        <Text style={styles.totalLabel}>Total cuota devengada</Text>
        <View style={styles.casillaBox}><Text style={styles.casillaNum}>[27]</Text><Text style={styles.casillaValue}>{mod303.totalCuotaDevengada.toFixed(2)}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#334155' }}>LIQUIDACIÓN - IVA DEDUCIBLE</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Por cuotas soportadas en op. interiores corrientes</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[28]</Text><Text style={styles.casillaValue}>{mod303.baseDeducible.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}></View>
          <View style={styles.casillaBox}><Text style={styles.casillaNum}>[29]</Text><Text style={styles.casillaValue}>{mod303.cuotaDeducible.toFixed(2)}</Text></View>
        </View>
      </View>

      <View style={{ ...styles.resultBox, backgroundColor: '#eff6ff', borderLeftColor: '#2563eb' }}>
        <View>
          <Text style={{ ...styles.resultLabel, color: '#1e3a8a' }}>Resultado de la Liquidación</Text>
          <Text style={{fontSize: 8, color: '#64748b', marginTop: 4}}>Si es positivo, a ingresar. Si es negativo, a compensar o devolver.</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.casillaNum}>[71]</Text>
          <Text style={{ ...styles.resultValue, color: '#1d4ed8' }}>{mod303.resultado.toFixed(2)} €</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Borrador generado por TaxGuard AI.</Text>
        <Text style={styles.footerText}>Página 1 de 1</Text>
      </View>
    </Page>
  </Document>
);

// PDF DEL MODELO 130 (IRPF)
const Borrador130PDF = ({ mod130, empresaId, trimestre, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#10b981' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 130</Text>
          <Text style={{ ...styles.subtitle, color: '#10b981' }}>IRPF - Pago Fraccionado</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Sujeto Pasivo</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Periodo (Acum)</Text><Text style={styles.infoValue}>{trimestre}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Fecha</Text><Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#064e3b' }}>I. CÁLCULO DEL RENDIMIENTO (Acumulado del año)</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Ingresos computables correspondientes al conjunto del periodo</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[01]</Text><Text style={styles.casillaValue}>{mod130.ingresosTotales.toFixed(2)}</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Gastos fiscalmente deducibles correspondientes al periodo</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[02]</Text><Text style={styles.casillaValue}>{mod130.gastosTotales.toFixed(2)}</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Rendimiento neto ([01] - [02])</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[03]</Text><Text style={styles.casillaValue}>{mod130.rendimientoNeto.toFixed(2)}</Text></View></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#064e3b', marginTop: 20 }}>II. CÁLCULO DEL PAGO FRACCIONADO</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>20% del rendimiento neto (si la casilla [03] es positiva)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[04]</Text><Text style={styles.casillaValue}>{mod130.pagoFraccionado.toFixed(2)}</Text></View></View>
      </View>

      <View style={{ ...styles.resultBox, backgroundColor: '#ecfdf5', borderLeftColor: '#10b981' }}>
        <View>
          <Text style={{ ...styles.resultLabel, color: '#065f46' }}>Resultado A Ingresar</Text>
          <Text style={{fontSize: 8, color: '#64748b', marginTop: 4}}>Importe del pago fraccionado a favor del Tesoro Público.</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.casillaNum}>[07]</Text>
          <Text style={{ ...styles.resultValue, color: '#047857' }}>{mod130.pagoFraccionado.toFixed(2)} €</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>Borrador generado por TaxGuard AI.</Text><Text style={styles.footerText}>Página 1 de 1</Text></View>
    </Page>
  </Document>
);

// PDF DEL MODELO 390 (RESUMEN ANUAL IVA)
const Borrador390PDF = ({ mod390, empresaId, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#8b5cf6' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 390</Text>
          <Text style={{ ...styles.subtitle, color: '#8b5cf6' }}>Declaración Resumen Anual - IVA</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Sujeto Pasivo</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Periodo</Text><Text style={styles.infoValue}>ANUAL (0A)</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Fecha Generación</Text><Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#4c1d95' }}>RESUMEN ANUAL - IVA DEVENGADO (INGRESOS)</Text>

      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen general (21%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.base21.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>21%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.cuota21.toFixed(2)}</Text></View>
        </View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen reducido (10%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.base10.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>10%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.cuota10.toFixed(2)}</Text></View>
        </View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Régimen superreducido (4%)</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.base4.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>4%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.cuota4.toFixed(2)}</Text></View>
        </View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Operaciones Exentas (0%) o No Sujetas</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.base0.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>0%</Text></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>0.00</Text></View>
        </View>
      </View>

      <View style={styles.totalDevengado}>
        <Text style={styles.totalLabel}>Total Volumen de Operaciones (Ingresos Anuales)</Text>
        <View style={styles.casillaBox}><Text style={styles.casillaNum}>[108]</Text><Text style={styles.casillaValue}>{mod390.totalIngresos.toFixed(2)}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#4c1d95' }}>RESUMEN ANUAL - IVA DEDUCIBLE (GASTOS)</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Por cuotas soportadas en op. interiores corrientes</Text>
        <View style={styles.boxGroup}>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.baseGastos.toFixed(2)}</Text></View>
          <View style={styles.casillaBox}></View>
          <View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod390.cuotaGastos.toFixed(2)}</Text></View>
        </View>
      </View>

      <View style={{ ...styles.resultBox, backgroundColor: '#f5f3ff', borderLeftColor: '#8b5cf6' }}>
        <View>
          <Text style={{ ...styles.resultLabel, color: '#5b21b6' }}>Resultado Liquidación Anual</Text>
          <Text style={{fontSize: 8, color: '#64748b', marginTop: 4}}>Total devengado anual menos total deducible anual.</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.casillaNum}>[84]</Text>
          <Text style={{ ...styles.resultValue, color: '#6d28d9' }}>{mod390.resultadoAnual.toFixed(2)} €</Text>
        </View>
      </View>

      <View style={styles.footer}><Text style={styles.footerText}>Borrador generado por TaxGuard AI. Informativo, no válido para registro AEAT.</Text><Text style={styles.footerText}>Página 1 de 1</Text></View>
    </Page>
  </Document>
);

// 🚀 PDF DEL MODELO 115 (RETENCIONES ALQUILERES — 19%)
const Borrador115PDF = ({ mod115, empresaId, trimestre, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#ec4899' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 115</Text>
          <Text style={{ ...styles.subtitle, color: '#ec4899' }}>Retenciones por Arrendamientos</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Retenedor</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Periodo</Text><Text style={styles.infoValue}>{trimestre}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Fecha</Text><Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#831843' }}>LIQUIDACIÓN - RENTAS DINERARIAS (ALQUILERES)</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Número de perceptores</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[01]</Text><Text style={styles.casillaValue}>{String(mod115.numPerceptores ?? 0)}</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Base de las retenciones (Alquileres)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[02]</Text><Text style={styles.casillaValue}>{mod115.baseRetencion.toFixed(2)}</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Retenciones e ingresos a cuenta (19%)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[03]</Text><Text style={styles.casillaValue}>{mod115.totalRetencion.toFixed(2)}</Text></View></View>
      </View>

      <View style={{ ...styles.resultBox, backgroundColor: '#fdf2f8', borderLeftColor: '#ec4899' }}>
        <View>
          <Text style={{ ...styles.resultLabel, color: '#831843' }}>Total a Ingresar</Text>
          <Text style={{fontSize: 8, color: '#64748b', marginTop: 4}}>Importe retenido por alquileres a ingresar en la AEAT.</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.casillaNum}>[05]</Text>
          <Text style={{ ...styles.resultValue, color: '#be185d' }}>{mod115.totalRetencion.toFixed(2)} €</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>Borrador generado por TaxGuard AI. Orientativo — revisar antes de presentar.</Text><Text style={styles.footerText}>Página 1 de 1</Text></View>
    </Page>
  </Document>
);

// 🚀 PDF DEL MODELO 111 (RETENCIONES PROFESIONALES — 15%)
const Borrador111PDF = ({ mod111, empresaId, trimestre, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#f43f5e' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 111</Text>
          <Text style={{ ...styles.subtitle, color: '#f43f5e' }}>Retenciones Profesionales</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Retenedor</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Periodo</Text><Text style={styles.infoValue}>{trimestre}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Fecha</Text><Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#9f1239' }}>LIQUIDACIÓN - RENDIMIENTOS PROFESIONALES</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Número de perceptores</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[01]</Text><Text style={styles.casillaValue}>{String(mod111.numPerceptores ?? 0)}</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Base de las retenciones (Profesionales)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[02]</Text><Text style={styles.casillaValue}>{mod111.baseRetencion.toFixed(2)}</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Retenciones e ingresos a cuenta (15%)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaNum}>[03]</Text><Text style={styles.casillaValue}>{mod111.totalRetencion.toFixed(2)}</Text></View></View>
      </View>

      <View style={{ ...styles.resultBox, backgroundColor: '#fff1f2', borderLeftColor: '#f43f5e' }}>
        <View>
          <Text style={{ ...styles.resultLabel, color: '#9f1239' }}>Total a Ingresar</Text>
          <Text style={{fontSize: 8, color: '#64748b', marginTop: 4}}>Importe retenido a profesionales a ingresar en la AEAT.</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.casillaNum}>[03]</Text>
          <Text style={{ ...styles.resultValue, color: '#e11d48' }}>{mod111.totalRetencion.toFixed(2)} €</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>Borrador generado por TaxGuard AI. Orientativo — revisar antes de presentar.</Text><Text style={styles.footerText}>Página 1 de 1</Text></View>
    </Page>
  </Document>
);

// 🚀 PDF DEL MODELO 347 (OPERACIONES > 3005€)
const Borrador347PDF = ({ mod347, empresaId, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#0891b2' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 347</Text>
          <Text style={{ ...styles.subtitle, color: '#0891b2' }}>Declaración Anual Operaciones con Terceros</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Declarante</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Límite Legal</Text><Text style={styles.infoValue}>3.005,06 €</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#164e63' }}>RELACIÓN DE DECLARADOS (SUPERAN EL LÍMITE)</Text>

      <View style={{...styles.rowItem, backgroundColor: '#f1f5f9'}}>
        <Text style={{...styles.rowLabel, fontWeight: 700}}>Nombre / Razón Social o Categoría</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={{...styles.casillaValue, fontWeight: 700}}>Importe Anual</Text></View></View>
      </View>

      {mod347.detalle.length === 0 ? (
         <View style={styles.rowItem}><Text style={styles.rowLabel}>No existen operaciones que superen los 3.005,06 €.</Text></View>
      ) : (
         mod347.detalle.map((op: any, i: number) => (
           <View key={i} style={styles.rowItem}>
             <Text style={styles.rowLabel}>{op.nombre}</Text>
             <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaValue}>{op.importe.toFixed(2)} €</Text></View></View>
           </View>
         ))
      )}

      <View style={styles.footer}><Text style={styles.footerText}>Borrador generado por TaxGuard AI.</Text><Text style={styles.footerText}>Página 1 de 1</Text></View>
    </Page>
  </Document>
);

// 🚀 PDF DEL MODELO 349 (OPERACIONES INTRACOMUNITARIAS)
const Borrador349PDF = ({ mod349, empresaId, trimestre, anio }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={{ ...styles.headerBox, borderBottomColor: '#4f46e5' }}>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Modelo 349</Text>
          <Text style={{ ...styles.subtitle, color: '#4f46e5' }}>Declaración Recapitulativa de Operaciones Intracomunitarias</Text>
        </View>
        <View style={styles.aeatBox}><Text style={styles.aeatText}>Agencia Tributaria - Borrador</Text></View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Declarante</Text><Text style={styles.infoValue}>{empresaId}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Ejercicio</Text><Text style={styles.infoValue}>{anio}</Text></View>
        <View style={styles.infoCol}><Text style={styles.infoLabel}>Periodo</Text><Text style={styles.infoValue}>{trimestre}</Text></View>
      </View>

      <Text style={{ ...styles.sectionTitle, backgroundColor: '#312e81' }}>RESUMEN DE OPERACIONES</Text>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Entregas Intracomunitarias (Ventas Europa)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod349.entregas.toFixed(2)} €</Text></View></View>
      </View>
      <View style={styles.rowItem}>
        <Text style={styles.rowLabel}>Adquisiciones Intracomunitarias (Compras Europa)</Text>
        <View style={styles.boxGroup}><View style={styles.casillaBox}><Text style={styles.casillaValue}>{mod349.adquisiciones.toFixed(2)} €</Text></View></View>
      </View>

      <View style={styles.footer}><Text style={styles.footerText}>Borrador generado por TaxGuard AI.</Text><Text style={styles.footerText}>Página 1 de 1</Text></View>
    </Page>
  </Document>
);

const BOTON_CONFIG: Record<string, string> = {
  '303': 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
  '130': 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
  '390': 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
  '115': 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/20',
  '111': 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
  '347': 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20',
  '349': 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20',
};

export default function ModelosTributariosPDFButton({ modeloActivo, datosModelo, empresaId, trimestre, anio, fileName }: {
  modeloActivo: '303' | '130' | '390' | '115' | '111' | '347' | '349';
  datosModelo: any;
  empresaId: string;
  trimestre: string;
  anio: string;
  fileName: string;
}) {
  const documentoPDF =
    modeloActivo === '303' ? <Borrador303PDF mod303={datosModelo} empresaId={empresaId} trimestre={trimestre} anio={anio} /> :
    modeloActivo === '130' ? <Borrador130PDF mod130={datosModelo} empresaId={empresaId} trimestre={trimestre} anio={anio} /> :
    modeloActivo === '390' ? <Borrador390PDF mod390={datosModelo} empresaId={empresaId} anio={anio} /> :
    modeloActivo === '115' ? <Borrador115PDF mod115={datosModelo} empresaId={empresaId} trimestre={trimestre} anio={anio} /> :
    modeloActivo === '111' ? <Borrador111PDF mod111={datosModelo} empresaId={empresaId} trimestre={trimestre} anio={anio} /> :
    modeloActivo === '347' ? <Borrador347PDF mod347={datosModelo} empresaId={empresaId} anio={anio} /> :
    <Borrador349PDF mod349={datosModelo} empresaId={empresaId} trimestre={trimestre} anio={anio} />;

  return (
    <PDFDownloadLink document={documentoPDF} fileName={fileName}>
      {/* @ts-ignore */}
      {({ loading }: { loading: boolean }) => (
        <button disabled={loading} className={`w-full sm:w-auto ${BOTON_CONFIG[modeloActivo]} text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          {loading ? "Generando PDF..." : `Descargar Mod. ${modeloActivo}`}
        </button>
      )}
    </PDFDownloadLink>
  );
}
