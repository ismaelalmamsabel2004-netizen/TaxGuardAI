import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/legal/terms', label: 'Términos y Condiciones' },
  { href: '/legal/privacy', label: 'Política de Privacidad' },
  { href: '/legal/notice', label: 'Aviso Legal' },
];

export default function LegalPageShell({
  title,
  subtitle,
  children,
  updatedAt = '6 de agosto de 2026',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  updatedAt?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" translate="no">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition">
            <img src="/icon-192x192.png" alt="TaxGuard AI" className="w-8 h-8 bg-white rounded-lg p-0.5 object-contain border border-slate-100" />
            <span className="text-lg font-black tracking-tight text-slate-900">
              TaxGuard<span className="text-blue-600">AI</span>
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-[11px] font-bold">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/precios" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition shrink-0">
            Ver planes →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Documentación legal</p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">{title}</h1>
        <p className="text-sm text-slate-500 font-medium mb-2">{subtitle}</p>
        <p className="text-[11px] text-slate-400 font-semibold mb-10">Última actualización: {updatedAt}</p>

        <article className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-10 prose-legal space-y-8">
          {children}
        </article>

        <div className="mt-10 flex flex-wrap gap-3 text-xs font-bold">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-slate-500 hover:text-blue-600 transition underline-offset-2 hover:underline">
              {item.label}
            </Link>
          ))}
          <Link href="/" className="text-slate-500 hover:text-blue-600 transition underline-offset-2 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400 bg-white">
        <p>© {new Date().getFullYear()} TaxGuard AI. Todos los derechos reservados.</p>
        <p className="mt-1">soporte.taxguard@gmail.com</p>
      </footer>
    </div>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-black text-slate-900 tracking-tight border-b border-slate-100 pb-2">{children}</h2>;
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed font-medium">{children}</p>;
}

export function LegalUl({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-slate-600 leading-relaxed font-medium flex gap-2">
          <span className="text-blue-500 font-black shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalAlert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 sm:p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-2">Cláusula crítica — Léala con atención</p>
      <h3 className="text-base font-black text-rose-900 mb-3">{title}</h3>
      <div className="space-y-3 text-sm text-rose-900/90 leading-relaxed font-medium">{children}</div>
    </aside>
  );
}
