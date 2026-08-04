/**
 * 🛡️ BLINDAJE: neutraliza la Inyección de Fórmulas CSV (CSV Injection / CWE-1236).
 * Si una celda empieza por =, +, -, @ o un tabulador, Excel/LibreOffice puede interpretarla
 * como una fórmula ejecutable al abrir el archivo (ej: un nombre de cliente pegado como
 * `=cmd|'/c calc'!A0`). Le añadimos un apóstrofo delante para forzar que se trate siempre
 * como texto plano, y quitamos saltos de línea para que no se cuele una fila falsa en el CSV.
 */
export function celdaCSVSegura(valorRaw: unknown): string {
  const valor = String(valorRaw ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (/^[=+\-@\t]/.test(valor)) {
    return `'${valor}`;
  }
  return valor;
}
