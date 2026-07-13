'use server'

import { prisma } from '../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. GUARDAR MANUAL
export async function guardarTransaccionManual(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const categoria = formData.get('categoria') as string;
  const tipo = formData.get('tipo') as string;
  const baseImponible = parseFloat(formData.get('baseImponible') as string);
  
  await prisma.transaccion.create({
    data: {
      userId: userId,
      categoria: categoria,
      tipo: tipo,
      baseImponible: baseImponible,
      iva: 21,
    }
  });

  revalidatePath('/dashboard');
}

// 2. ESCÁNER IA
export async function procesarFacturaIA(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "Usuario de seguridad no encontrado." };

  const file = formData.get('factura') as File;
  if (!file || file.size === 0) return { error: "El archivo no ha llegado al servidor." };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Eres un contable experto. Analiza esta imagen de una factura o ticket. 
      Devuelve SOLO y EXCLUSIVAMENTE un objeto JSON, sin añadir comillas invertidas (\`\`\`) ni la palabra "json".
      Ejemplo exacto de lo que debes devolver:
      {"categoria": "MATERIAL", "tipo": "GASTO", "baseImponible": 45.50}
      Opciones de categoria: VENTAS, NOMINAS, LOGISTICA, MATERIAL.
      Opciones de tipo: INGRESO, GASTO.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: file.type
        }
      }
    ]);

    const textoRespuesta = result.response.text();
    let jsonLimpio = textoRespuesta.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let datosExtraidos;
    try {
      datosExtraidos = JSON.parse(jsonLimpio);
    } catch (parseError) {
      console.log("Lo que respondió la IA:", textoRespuesta);
      return { error: "La IA se ha confundido leyendo la foto. Intenta con una imagen más clara." };
    }

    await prisma.transaccion.create({
      data: {
        userId: userId,
        categoria: datosExtraidos.categoria,
        tipo: datosExtraidos.tipo,
        baseImponible: parseFloat(datosExtraidos.baseImponible),
        iva: 21,
      }
    });

    revalidatePath('/dashboard');
    return { success: true }; 
    
  } catch (error: any) {
    console.error("Fallo del servidor:", error);
    return { error: error.message || "Fallo grave en la conexión con la IA de Google." };
  }
}

// 3. BORRAR TRANSACCIÓN (Control Total)
export async function borrarTransaccion(transaccionId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Seguridad no validada." };

  try {
    await prisma.transaccion.delete({
      where: {
        id: transaccionId,
        userId: userId, 
      }
    });

    revalidatePath('/dashboard');
    return { success: true };
    
  } catch (error) {
    console.error(error);
    return { error: "No se ha podido borrar la transacción. Intenta de nuevo." };
  }
}