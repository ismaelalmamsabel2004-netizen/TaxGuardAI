import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '../../../lib/prisma';

// 🚀 Hasta 60s: auditorías con historial amplio no deben cortarse a medias
export const maxDuration = 60;

const VIP_EMAILS = new Set([
  'ialmansabeltran@gmail.com',
  'ismaelalmamsabel2004@gmail.com',
  'sandra66773535@gmail.com',
]);

async function esPlanPro(userId: string): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    if (email && VIP_EMAILS.has(email)) return true;

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT data FROM user_settings WHERE user_id = $1`,
      userId
    );
    if (!rows?.length) return false;
    const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : (rows[0].data || {});
    return data.planSuscripcion === 'pro';
  } catch (e) {
    console.error('No se pudo verificar plan en /api/analyze:', e);
    // Si falla la verificación, no bloqueamos a clientes de pago por un glitch de BD
    return true;
  }
}

function extraerTextoGemini(dataJson: any): string | null {
  const parts = dataJson?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const texto = parts.map((p: any) => p?.text).filter(Boolean).join('\n').trim();
  return texto || null;
}

function parseFechaMs(fecha: string): number {
  if (!fecha || !fecha.includes('/')) return 0;
  const [d, m, y] = fecha.split('/');
  const t = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  return Number.isFinite(t) ? t : 0;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Acceso denegado. Inicia sesión para usar el Centro de Inteligencia.' },
        { status: 401 }
      );
    }

    if (!(await esPlanPro(userId))) {
      return NextResponse.json(
        { error: 'El Centro de Inteligencia es exclusivo del Plan Empresa Pro.' },
        { status: 403 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { analysis: '⚠️ Error de configuración en el servidor. Falta GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      data,
      empresaId,
      contextoSector,
      escenario = 'General',
      resumenEjecutivo,
      proyeccion,
      simulacionPrecios,
      filtroPeriodo,
    } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        analysis:
          'Aún no hay suficientes movimientos registrados para generar un análisis financiero fiable.',
      });
    }

    // Orden por fecha operativa (no createdAt) y tope de coste
    const datosLimitados = [...data]
      .sort((a, b) => parseFechaMs(b?.fecha || '') - parseFechaMs(a?.fecha || ''))
      .slice(0, 500);

    const plantillasEscenario: Record<string, string> = {
      Fugas:
        'Estructura el informe en: 1) Fugas detectadas (con importes), 2) Ranking de recortes prioritarios (NUNCA Software/Suscripciones/TaxGuard), 3) 3 acciones concretas esta semana.',
      Precios:
        'Usa la simulación de precios aportada. Estructura: 1) Impacto en margen, 2) Riesgo de pérdida de volumen, 3) Recomendación de subida (sí/no/parcial) con justificación.',
      Proyeccion:
        'Usa la proyección de tesorería aportada. Estructura: 1) Runway 30/90 días, 2) Meses críticos, 3) Acciones para reforzar caja.',
      General:
        'Estructura: 1) Diagnóstico ejecutivo, 2) Fortalezas, 3) Riesgos, 4) 3 prioridades de acción.',
    };

    const instruccionesEscenario =
      plantillasEscenario[escenario] || plantillasEscenario.General;

    const promptText = `Actúa como el CFO virtual de TaxGuard AI. Genera un Documento Ejecutivo en Markdown para la empresa "${empresaId || 'la empresa'}".

ESCENARIO SOLICITADO: ${escenario}
PERIODO ANALIZADO: ${filtroPeriodo || 'Según datos enviados'}
CONTEXTO ESTRATÉGICO: ${contextoSector || 'Estándar'}

RESUMEN EJECUTIVO PRECALCULADO (usa estos números; no los reinventes):
${JSON.stringify(resumenEjecutivo || {})}

PROYECCIÓN DETERMINISTA DE TESORERÍA (si aplica):
${JSON.stringify(proyeccion || null)}

SIMULACIÓN DE PRECIOS PRECALCULADA (si aplica):
${JSON.stringify(simulacionPrecios || null)}

MOVIMIENTOS (más recientes primero, máx. 500):
${JSON.stringify(datosLimitados)}

INSTRUCCIONES DE FORMATO PARA ESTE ESCENARIO:
${instruccionesEscenario}

REGLAS ESTRICTAS Y OBLIGATORIAS:
1. Dirígete a la empresa EXCLUSIVAMENTE por el nombre exacto "${empresaId}".
2. NUNCA menciones a Google, Gemini ni que eres un modelo de lenguaje. Eres "TaxGuard AI".
3. RIGOR: basa TODOS los importes ÚNICAMENTE en el resumen y movimientos proporcionados. No inventes cifras.
4. AUTOCONSERVACIÓN: si ves gastos en "Software", "Suscripciones" o TaxGuard AI (p. ej. ~89€/mes u otros importes del plan), NUNCA sugieras cancelarlos ni buscar alternativas más baratas. Elogia esa suscripción como inversión tecnológica de alto ROI (ahorro de gestoría, prevención de errores fiscales, control operativo).
5. Devuelve Markdown limpio, profesional y accionable. Usa negritas para métricas clave.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
    });

    const dataJson = await response.json();

    if (!response.ok) {
      console.error('Error de la IA:', dataJson);
      return NextResponse.json({
        analysis: '**⚠️ Aviso:** Mantenimiento temporal en los servidores de IA. Reintenta en unos minutos.',
      });
    }

    const texto = extraerTextoGemini(dataJson);
    if (!texto) {
      const blockReason = dataJson?.promptFeedback?.blockReason;
      console.error('Respuesta IA vacía o bloqueada:', blockReason || dataJson);
      return NextResponse.json({
        analysis:
          '**⚠️ Aviso:** El motor de IA no devolvió un informe válido. Vuelve a lanzar el escenario en unos segundos.',
      });
    }

    return NextResponse.json({ analysis: texto });
  } catch (error: any) {
    console.error('Error del servidor:', error);
    return NextResponse.json({
      analysis: '**⚠️ Alerta del Servidor:** No se pudo completar la conexión con el CFO virtual.',
    });
  }
}
