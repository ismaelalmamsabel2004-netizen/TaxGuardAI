import { prisma } from './prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

// 🛡️ MOTOR DE SEGURIDAD B2B: IDENTIFICADOR COMPUESTO
// Vive en su propio módulo (sin dependencias de Supabase) para que tanto las Server Actions
// (app/actions.ts) como las rutas /api que escriben en la base de datos (ej: importación
// bancaria) puedan reutilizar exactamente el mismo control de permisos (PROPIETARIO/LECTURA/NINGUNO)
// sin arrastrar módulos innecesarios ni duplicar la lógica de seguridad.
export async function getContextoSeguro(empresaIdRaw?: string) {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) throw new Error("No autenticado");

    const miEmail = user.primaryEmailAddress?.emailAddress;
    let realEmpresaId = empresaIdRaw || "Mi Empresa Principal";
    let targetUserId = userId;
    let rol = "PROPIETARIO";

    // Si es un Asesor entrando al espacio de un cliente
    if (empresaIdRaw && empresaIdRaw.startsWith("CLIENTE|")) {
        const parts = empresaIdRaw.split('|');
        if (parts.length === 3) {
            targetUserId = parts[1];
            realEmpresaId = parts[2] || "Mi Empresa Principal";
            rol = "NINGUNO";

            if (miEmail) {
                const permiso = await prisma.permisoEmpresa.findFirst({
                    where: { empresaId: realEmpresaId, propietarioId: targetUserId, asesorEmail: miEmail }
                });
                if (permiso) {
                    rol = permiso.rol; // "LECTURA"
                }
            }
        }
    } else {
        // Verificación extra por si la empresa se guardó como "undefined"
        if (realEmpresaId === "undefined" || realEmpresaId.includes("CLIENTE_undefined")) {
            realEmpresaId = "Mi Empresa Principal";
        }
    }

    return { targetUserId, realEmpresaId, rol, userId, miEmail };
}
