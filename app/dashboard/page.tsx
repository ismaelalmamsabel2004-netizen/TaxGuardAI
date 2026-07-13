import { prisma } from '../../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { guardarTransaccionManual } from '../actions';
import ScannerIA from './ScannerIA';
import BotoBorrar from './BotoBorrar'; // ¡Necesario!

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const transacciones = await prisma.transaccion.findMany({
    where: { userId: userId },
    orderBy: { createdAt: 'desc' },
  });

  // --- CÁLCULOS FINANCIEROS (¡Lo Nuevo!) ---
  const totalIngresos = transacciones
    .filter(t => t.tipo === 'INGRESO')
    .reduce((sum, t) => sum + t.baseImponible, 0);

  const totalGastos = transacciones
    .filter(t => t.tipo === 'GASTO')
    .reduce((sum, t) => sum + t.baseImponible, 0);

  const beneficioNeto = totalIngresos - totalGastos;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabecera y Perfil de Clerk (¡Puro Lujo!) */}
        <header className="mb-8 flex items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Libro Mayor Integrado</h1>
            <p className="text-slate-500 mt-1 text-base">Automatización financiera premium para tus clientes.</p>
          </div>
          {/* Aquí Clerk pintará el avatar del usuario y el botón de logout solo */}
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-200 text-slate-400">👤</div>
        </header>

        {/* --- TARJETAS DE RESUMEN (¡Lo Nuevo!) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ingresos (Verde) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex items-center gap-5">
            <div className="p-3.5 bg-emerald-100/50 rounded-2xl text-emerald-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Ingresos (Julio)</p>
              <p className="text-3xl font-black text-slate-900 mt-0.5">+{totalIngresos.toFixed(2)} €</p>
            </div>
          </div>
          
          {/* Gastos (Rojo) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100 flex items-center gap-5">
            <div className="p-3.5 bg-rose-100/50 rounded-2xl text-rose-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6"></path></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Gastos (Julio)</p>
              <p className="text-3xl font-black text-slate-900 mt-0.5">-{totalGastos.toFixed(2)} €</p>
            </div>
          </div>

          {/* Beneficio Neto (Azul) */}
          <div className="bg-slate-900 p-6 rounded-3xl shadow-lg border border-slate-700 flex items-center gap-5">
            <div className="p-3.5 bg-slate-700 rounded-2xl text-slate-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 uppercase tracking-wider">Beneficio Neto</p>
              <p className={`text-3xl font-black ${beneficioNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-0.5`}>
                {beneficioNeto >= 0 ? '+' : ''}{beneficioNeto.toFixed(2)} €
              </p>
            </div>
          </div>
        </div>

        {/* ... (Aquí siguen las columnas de Entrada Manual y el Escáner IA con su nuevo diseño premium) ... */}
        {/* ... (Para no hacerlo eterno, asumo que has pegado el diseño premium del paso anterior en page.tsx) ... */}

        {/* ... (Solo necesitamos cambiar la TABLA para añadir la columna de BORRAR) ... */}

        {/* LA TABLA DE TRANSACCIONES PREMIUM */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {transacciones.length === 0 ? (
            // ... (Aviso de vacío premium) ...
            <div className="p-12 text-center">Empty</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-5">Fecha</th>
                    <th className="p-5">Categoría</th>
                    <th className="p-5">Tipo</th>
                    <th className="p-5 text-right">Base Imponible</th>
                    <th className="p-5 text-center">Borrar</th> {/* ¡NUEVA COLUMNA! */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transacciones.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-5 text-sm text-slate-900 font-medium">
                        {t.createdAt.toLocaleDateString('es-ES')}
                      </td>
                      <td className="p-5">
                        <span className="bg-slate-100 text-slate-700 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide">
                          {t.categoria}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${t.tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {t.tipo}
                        </span>
                      </td>
                      <td className={`p-5 text-right text-sm font-black ${t.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.tipo === 'INGRESO' ? '+' : '-'}{t.baseImponible.toFixed(2)} €
                      </td>
                      {/* ¡NUEVO COMPONENTE INTERACTIVO! */}
                      <td className="p-5 text-center">
                        <BotoBorrar transaccionId={t.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}