'use client';

import { useMemo, useState } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import { consentimientoLegalSchema, mapearErroresZod } from '@/lib/validations';
import LegalConsentCheckboxes, {
  bothConsentsAccepted,
  type LegalConsentState,
} from '@/components/legal/LegalConsentCheckboxes';

const INITIAL: LegalConsentState = {
  acceptTerms: false,
  acceptPrivacy: false,
};

type Props = {
  /** Texto del CTA principal */
  ctaLabel?: string;
  /** Variante visual */
  variant?: 'light' | 'dark';
};

/**
 * Barrera de registro B2B: el SignUp de Clerk solo se habilita
 * cuando el usuario acepta Términos (Cláusula Escudo) + Privacidad.
 */
export default function RegisterConsentForm({
  ctaLabel = 'Crear Cuenta',
  variant = 'light',
}: Props) {
  const [consent, setConsent] = useState<LegalConsentState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof LegalConsentState, string>>>({});
  const [triedSubmit, setTriedSubmit] = useState(false);

  const canProceed = useMemo(() => bothConsentsAccepted(consent), [consent]);

  const validate = (next: LegalConsentState) => {
    const parsed = consentimientoLegalSchema.safeParse(next);
    if (!parsed.success) {
      setErrors(mapearErroresZod(parsed.error) as Partial<Record<keyof LegalConsentState, string>>);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (next: LegalConsentState) => {
    setConsent(next);
    if (triedSubmit) validate(next);
  };

  const handleBlockedClick = () => {
    setTriedSubmit(true);
    validate(consent);
  };

  const buttonClass =
    variant === 'dark'
      ? 'w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-blue-500/20 border border-blue-400/20 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600'
      : 'w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/15 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600';

  return (
    <div className="space-y-4" translate="no">
      <LegalConsentCheckboxes
        value={consent}
        onChange={handleChange}
        errors={errors}
        variant={variant}
        idPrefix="registro"
      />

      {canProceed ? (
        <SignUpButton mode="modal">
          <button type="button" className={buttonClass}>
            {ctaLabel}
          </button>
        </SignUpButton>
      ) : (
        <button type="button" disabled className={buttonClass} onClick={handleBlockedClick}>
          {ctaLabel}
        </button>
      )}

      {!canProceed && triedSubmit ? (
        <p
          className={
            variant === 'dark'
              ? 'text-xs font-bold text-amber-400 text-center'
              : 'text-xs font-bold text-amber-700 text-center'
          }
        >
          Debe aceptar ambos documentos legales para crear la cuenta.
        </p>
      ) : null}
    </div>
  );
}
