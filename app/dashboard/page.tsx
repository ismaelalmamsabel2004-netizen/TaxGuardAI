export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-lg border border-green-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">¡Pago completado!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Bienvenido a tu panel de control de TaxGuard AI. Tu suscripción está activa.
        </p>
        <p className="text-sm text-gray-400">
          (Aquí instalaremos el Libro Mayor, las facturas y el chat con la Inteligencia Artificial)
        </p>
      </div>
    </div>
  );
}