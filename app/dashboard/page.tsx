import { prisma } from '../../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  // 1. Identificamos al usuario actual (Añadimos 'await' por la nueva versión de Clerk)
  const { userId } = await auth();

  // Si alguien intenta entrar sin estar logueado, lo devolvemos a la puerta
  if (!userId) {
    redirect('/sign-in');
  }

  // 2. Extraemos el Libro Mayor de ESTE usuario desde Supabase
  const transacciones = await prisma.transaccion.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      fecha: 'desc', // Las más recientes primero
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Libro Mayor Integrado</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {transacciones.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Tu Libro Mayor está vacío</h3>
              <p className="text-gray-500 mt-2">Aún no hay facturas ni transacciones registradas en tu cuenta.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Base Imponible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transacciones.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-900 font-medium">
                        {t.fecha.toLocaleDateString('es-ES')}
                      </td>
                      <td className="p-4">
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold">
                          {t.categoria}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${t.tipo === 'INGRESO' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {t.tipo}
                        </span>
                      </td>
                      <td className={`p-4 text-right text-sm font-bold ${t.tipo === 'INGRESO' ? 'text-green-600' : 'text-gray-900'}`}>
                        {t.tipo === 'INGRESO' ? '+' : '-'}{t.baseImponible} €
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