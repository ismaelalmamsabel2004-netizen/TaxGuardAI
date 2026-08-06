import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | TaxGuard AI Legal',
    default: 'Legal | TaxGuard AI',
  },
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
