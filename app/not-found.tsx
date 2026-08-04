import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6" translate="no">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6 text-3xl">
          🧭
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Página no encontrada</h1>
        <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
          La página que buscas no existe o se ha movido de sitio.
        </p>
        <Link
          href="/"
          className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
        >
          Ir a la Consola General
        </Link>
      </div>
    </div>
  );
}
