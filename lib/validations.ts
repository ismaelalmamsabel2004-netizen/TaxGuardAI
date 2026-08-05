import { z } from 'zod';

// ============================================================
// 🛡️ VALIDADOR REAL DE NIF / NIE / CIF ESPAÑOL
// No es solo un regex de formato: comprueba la letra de control
// real, igual que haría la Agencia Tributaria.
// ============================================================

const LETRAS_NIF = 'TRWAGMYFPDXBNJZSQVHLCKE';
const LETRAS_CIF_CONTROL = 'JABCDEFGHI';
// Organizaciones cuya letra de control del CIF es siempre una letra (no un dígito)
const CIF_LETRA_OBLIGATORIA = 'PQSW';
// Organizaciones cuya letra de control del CIF es siempre un dígito
const CIF_DIGITO_OBLIGATORIO = 'ABEH';

function validarDniNie(valorLimpio: string): boolean {
  // NIE: empieza por X, Y o Z -> se sustituye por 0, 1, 2 para el cálculo
  const match = valorLimpio.match(/^([XYZ])(\d{7})([A-Z])$/) || valorLimpio.match(/^(\d{8})([A-Z])$/);
  if (!match) return false;

  let numero: number;
  let letra: string;

  if (match.length === 4) {
    // NIE
    const prefijo = { X: '0', Y: '1', Z: '2' }[match[1]] ?? '';
    numero = Number(prefijo + match[2]);
    letra = match[3];
  } else {
    // DNI
    numero = Number(match[1]);
    letra = match[2];
  }

  return LETRAS_NIF[numero % 23] === letra;
}

function validarCif(valorLimpio: string): boolean {
  const match = valorLimpio.match(/^([A-HJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!match) return false;

  const letraOrg = match[1];
  const numero = match[2];
  const control = match[3];

  let sumaPar = 0;
  let sumaImpar = 0;

  for (let i = 0; i < numero.length; i++) {
    const digito = Number(numero[i]);
    if (i % 2 === 0) {
      // posiciones impares (índice par): se duplica y se suman los dígitos del resultado
      const doble = digito * 2;
      sumaImpar += doble > 9 ? doble - 9 : doble;
    } else {
      sumaPar += digito;
    }
  }

  const sumaTotal = sumaPar + sumaImpar;
  const digitoControl = (10 - (sumaTotal % 10)) % 10;

  if (CIF_DIGITO_OBLIGATORIO.includes(letraOrg)) {
    return control === String(digitoControl);
  }
  if (CIF_LETRA_OBLIGATORIA.includes(letraOrg)) {
    return control === LETRAS_CIF_CONTROL[digitoControl];
  }
  // El resto de organizaciones aceptan tanto letra como número como dígito de control
  return control === String(digitoControl) || control === LETRAS_CIF_CONTROL[digitoControl];
}

/**
 * Valida un NIF (DNI), NIE o CIF español comprobando su letra/dígito de control real.
 * Devuelve `false` para cadenas vacías salvo que se indique lo contrario por el propio esquema (campo opcional).
 */
export function esNifCifValido(valorRaw: string): boolean {
  if (!valorRaw) return false;
  const valor = valorRaw.trim().toUpperCase().replace(/[\s-]/g, '');

  if (/^\d{8}[A-Z]$/.test(valor) || /^[XYZ]\d{7}[A-Z]$/.test(valor)) {
    return validarDniNie(valor);
  }
  if (/^[A-HJNPQRSUVW]\d{7}[0-9A-J]$/.test(valor)) {
    return validarCif(valor);
  }
  return false;
}

/** Esquema Zod para un campo NIF/CIF obligatorio. */
export const nifCifRequerido = z
  .string()
  .trim()
  .min(1, 'El NIF/CIF es obligatorio.')
  .transform((v) => v.toUpperCase())
  .refine((v) => esNifCifValido(v), 'El NIF/CIF introducido no es válido.');

/** Esquema Zod para un campo NIF/CIF opcional (solo se valida si el usuario escribe algo). */
export const nifCifOpcional = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === '' || esNifCifValido(v), 'El NIF/CIF introducido no es válido.')
  .optional()
  .or(z.literal(''));

// ============================================================
// 💶 IMPORTES MONETARIOS
// ============================================================

/** Convierte "1.234,56", "1234.56", "1234,56" en un número JS. */
export function parsearImporte(valor: string): number {
  if (!valor) return NaN;
  const limpio = valor.trim().replace(/\./g, (match, offset, str) => {
    // Si hay una coma después del último punto, el punto es separador de miles -> se elimina
    return str.includes(',') ? '' : match;
  }).replace(/,/g, '.');
  return parseFloat(limpio);
}

/** Esquema Zod para un importe en euros: positivo, con como máximo 2 decimales y por debajo de un tope razonable. */
export const importeSchema = z
  .string()
  .trim()
  .min(1, 'El importe es obligatorio.')
  .refine((v) => !isNaN(parsearImporte(v)), 'Introduce solo números (ej: 500.50).')
  .refine((v) => parsearImporte(v) > 0, 'El importe debe ser mayor que cero.')
  .refine((v) => parsearImporte(v) < 10_000_000, 'El importe parece demasiado alto. Revísalo.')
  .refine((v) => {
    // Redondeamos a 2 decimales y comparamos: evita falsos negativos por imprecisión
    // de coma flotante (ej: 19.99 * 100 === 1998.9999999999998 en JS).
    const num = parsearImporte(v);
    return Number(num.toFixed(2)) === num;
  }, 'El importe no puede tener más de 2 decimales.');

// ============================================================
// 📅 FECHAS
// ============================================================

export const fechaOperativaSchema = z
  .string()
  .min(1, 'La fecha es obligatoria.')
  .refine((v) => !isNaN(new Date(v).getTime()), 'La fecha introducida no es válida.')
  .refine((v) => {
    const fecha = new Date(v);
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() + 1);
    return fecha <= limite;
  }, 'La fecha no puede ser superior a un año en el futuro.');

// ============================================================
// 📇 CONTACTO / CLIENTE (CRM)
// ============================================================

/** Comprobación básica de formato IBAN (longitud y patrón por país; no calcula el dígito de control MOD-97). */
export function ibanTieneFormatoValido(valorRaw: string): boolean {
  const valor = valorRaw.trim().toUpperCase().replace(/\s/g, '');
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(valor);
}

export const contactoCrmSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(150),
  tipo: z.enum(['CLIENTE', 'PROVEEDOR']).optional().default('CLIENTE'),
  nif: nifCifOpcional,
  direccion: z.string().trim().max(250).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'El email no es válido.')
    .optional()
    .or(z.literal('')),
  telefono: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[+\d][\d\s-]{6,15}$/.test(v), 'El teléfono no es válido.')
    .optional()
    .or(z.literal('')),
  iban_bancario: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || ibanTieneFormatoValido(v), 'El IBAN no tiene un formato válido (ej: ES91 2100 0418 4502 0005 1332).')
    .optional()
    .or(z.literal('')),
});

// ============================================================
// 🧾 TRANSACCIÓN MANUAL (Ingreso / Gasto)
// ============================================================

export const transaccionSchema = z.object({
  mes: fechaOperativaSchema,
  ingreso: importeSchema,
  categoria: z.string().trim().min(1, 'Selecciona una categoría.'),
  cifEmisor: nifCifOpcional,
});

// ============================================================
// 📸 RESULTADO OCR (Gemini)
// ============================================================

export const ocrFacturaSchema = z.object({
  categoria: z.string().trim().optional().nullable(),
  base_imponible: z.coerce.number().finite().min(0).max(10_000_000).optional().nullable(),
  iva: z.coerce.number().finite().min(0).max(100).optional().nullable(),
  fecha: z.string().trim().optional().nullable(),
  numero_factura: z.string().trim().max(80).optional().nullable(),
  concepto: z.string().trim().max(200).optional().nullable(),
  cliente_nombre: z.string().trim().max(150).optional().nullable(),
  nif: z.string().trim().max(20).optional().nullable(),
  confianza: z.coerce.number().finite().min(0).max(100).optional().nullable(),
  evidencia: z.string().trim().max(500).optional().nullable(),
});

// ============================================================
// 🔧 UTILIDAD: convierte errores de Zod en un mapa {campo: mensaje}
// ============================================================

export function mapearErroresZod(error: z.ZodError): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = issue.path.join('.') || '_general';
    if (!mapa[campo]) mapa[campo] = issue.message;
  }
  return mapa;
}
