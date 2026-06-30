import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("No se ha encontrado la GEMINI_API_KEY en el servidor.");
    }

    const body = await request.json();
    const { data, context } = body; 

    // 1. Construimos el cerebro del Director Financiero
    let prompt = `Actúa como un Director Financiero (CFO) de élite. Analiza este historial de ingresos y gastos: ${JSON.stringify(data)}. `;

    if (context && context.nombre) {
      prompt += `
      IMPORTANTE - CONTEXTO DEL CLIENTE:
      - Empresa: ${context.nombre}
      - Sector/Industria: ${context.sector}
      - Objetivo o Situación actual: ${context.detalles}

      Instrucciones estrictas: 
      1. Dirígete a la empresa por su nombre de forma profesional.
      2. Adapta todo tu lenguaje, ejemplos y recomendaciones específicamente a su sector industrial.
      3. Ten en cuenta su objetivo o situación actual para dar consejos útiles y realistas basados en los números que te he pasado.
      4. Formatea la respuesta en Markdown profesional, con títulos, negritas y listas.`;
    } else {
      prompt += `\nGenera un informe financiero general en formato Markdown estructurado destacando márgenes y tendencias.`;
    }

    // 2. MODO AUTO-DESCUBRIMIENTO: Preguntamos a Google qué modelos tienes habilitados
    const urlModelos = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const resModelos = await fetch(urlModelos);
    const dataModelos = await resModelos.json();

    if (!dataModelos.models) {
      throw new Error("No se pudo leer tu cuenta de Google. Revisa que tu API Key sea correcta.");
    }

    // Filtramos para buscar un modelo de texto de Gemini que sirva para generar contenido
    const modelosValidos = dataModelos.models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent") && 
      m.name.includes("gemini") &&
      !m.name.includes("vision") // Excluimos los de solo imagen
    );

    if (modelosValidos.length === 0) {
      throw new Error("Tu API Key no tiene acceso a ningún modelo Gemini de texto en tu región.");
    }

    // Seleccionamos el mejor modelo disponible de tu lista personal
    const modeloElegido = modelosValidos.find((m: any) => m.name.includes("1.5-flash")) 
                       || modelosValidos.find((m: any) => m.name.includes("1.5-pro")) 
                       || modelosValidos.find((m: any) => m.name.includes("1.0-pro")) 
                       || modelosValidos[0];

    console.log("¡Modelo auto-detectado con éxito! Usando:", modeloElegido.name);

    // 3. HACEMOS LA PETICIÓN AL MODELO EXACTO QUE GOOGLE NOS HA DADO
    // Usamos la propiedad .name que ya incluye "models/gemini-..."
    const urlAnalisis = `https://generativelanguage.googleapis.com/v1beta/${modeloElegido.name}:generateContent?key=${apiKey}`;
    
    const response = await fetch(urlAnalisis, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error al procesar los datos con la IA.");
    }

    const responseData = await response.json();
    const text = responseData.candidates[0].content.parts[0].text;

    return NextResponse.json({ analysis: text });
    
  } catch (error: any) {
    console.error("Fallo detectado:", error);
    return NextResponse.json({ 
      analysis: `**⚠️ Alerta del Servidor:** \n\nNo se pudo completar el análisis. Motivo técnico: *${error.message}*` 
    });
  }
}