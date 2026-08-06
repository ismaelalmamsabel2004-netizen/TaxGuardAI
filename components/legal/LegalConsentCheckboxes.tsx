'use client';

import Link from 'next/link';

export type LegalConsentState = {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

type Variant = 'light' | 'dark';

type Props = {
  value: LegalConsentState;
  onChange: (next: LegalConsentState) => void;
  errors?: Partial<Record<keyof LegalConsentState, string>>;
  variant?: Variant;
  idPrefix?: string;
};

const styles = {
  light: {
    box: 'rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3',
    label: 'text-sm text-slate-700 font-medium leading-snug',
    link: 'text-blue-600 font-bold hover:underline',
    error: 'text-xs font-bold text-rose-600 mt-1',
    check: 'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500',
    hint: 'text-[11px] text-slate-500 font-medium',
  },
  dark: {
    box: 'rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3',
    label: 'text-sm text-slate-300 font-medium leading-snug',
    link: 'text-blue-400 font-bold hover:underline',
    error: 'text-xs font-bold text-rose-400 mt-1',
    check: 'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500',
    hint: 'text-[11px] text-slate-500 font-medium',
  },
};

export default function LegalConsentCheckboxes({
  value,
  onChange,
  errors,
  variant = 'light',
  idPrefix = 'legal',
}: Props) {
  const s = styles[variant];

  return (
    <div className={s.box} translate="no">
      <p className={s.hint}>
        Obligatorio antes de crear cuenta o suscribirse. Incluye la Cláusula Escudo (exención de
        responsabilidad fiscal).
      </p>

      <div>
        <label htmlFor={`${idPrefix}-terms`} className={`flex items-start gap-3 cursor-pointer ${s.label}`}>
          <input
            id={`${idPrefix}-terms`}
            type="checkbox"
            checked={value.acceptTerms}
            onChange={(e) => onChange({ ...value, acceptTerms: e.target.checked })}
            className={s.check}
          />
          <span>
            He leído y acepto los{' '}
            <Link href="/legal/terms" target="_blank" rel="noopener noreferrer" className={s.link}>
              Términos y Condiciones
            </Link>{' '}
            (incluyendo la exención de responsabilidad fiscal).
          </span>
        </label>
        {errors?.acceptTerms ? <p className={s.error}>{errors.acceptTerms}</p> : null}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-privacy`} className={`flex items-start gap-3 cursor-pointer ${s.label}`}>
          <input
            id={`${idPrefix}-privacy`}
            type="checkbox"
            checked={value.acceptPrivacy}
            onChange={(e) => onChange({ ...value, acceptPrivacy: e.target.checked })}
            className={s.check}
          />
          <span>
            Acepto la{' '}
            <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className={s.link}>
              Política de Privacidad
            </Link>
            .
          </span>
        </label>
        {errors?.acceptPrivacy ? <p className={s.error}>{errors.acceptPrivacy}</p> : null}
      </div>
    </div>
  );
}

export function bothConsentsAccepted(value: LegalConsentState): boolean {
  return Boolean(value.acceptTerms && value.acceptPrivacy);
}
