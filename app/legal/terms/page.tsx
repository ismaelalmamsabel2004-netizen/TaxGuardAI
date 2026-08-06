import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageShell, { LegalAlert, LegalH2, LegalP, LegalUl } from '../../../components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Términos y Condiciones B2B',
  description: 'Condiciones de uso del software TaxGuard AI para autónomos y PYMEs, incluyendo la cláusula de exención de responsabilidad fiscal.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Términos y Condiciones de Uso (B2B)"
      subtitle="Contrato de prestación de servicio SaaS entre TaxGuard AI y el Cliente profesional (autónomo o empresa)."
    >
      <section className="space-y-3">
        <LegalH2>1. Identificación del Prestador y objeto</LegalH2>
        <LegalP>
          Los presentes Términos y Condiciones (en adelante, los «Términos») regulan el acceso y uso de la
          plataforma software como servicio «TaxGuard AI» (en adelante, el «Servicio» o la «Plataforma»),
          accesible principalmente a través de <strong>www.taxguard-ai.com</strong>.
        </LegalP>
        <LegalP>
          El Prestador del Servicio es <strong>TaxGuard AI</strong> (nombre comercial TaxGuard AI),
          con domicilio en Calle Palomar nº 51, 21860 Villalba del Alcor, Huelva, España, e-mail{' '}
          <strong>soporte.taxguard@gmail.com</strong> y teléfono <strong>+34 635 997 325</strong>.
          El NIF fiscal está pendiente de alta como autónomo y se actualizará en el{' '}
          <Link href="/legal/notice" className="text-blue-600 font-bold hover:underline">Aviso Legal</Link>{' '}
          en cuanto se formalice. Al crear una cuenta, suscribirse o utilizar el Servicio, usted
          (el «Cliente» o el «Usuario») declara actuar en calidad de profesional, empresario o
          autónomo, y acepta estos Términos íntegramente.
        </LegalP>
        <LegalP>
          El objeto del Servicio es proporcionar una herramienta tecnológica de asistencia para la
          organización contable interna, digitalización de documentos (OCR), seguimiento de tesorería y
          generación de borradores orientativos de modelos tributarios. El Servicio no constituye asesoría
          fiscal, jurídica ni de auditoría, ni sustituye a un asesor fiscal colegiado ni a la Agencia Tributaria.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>2. Modalidades de suscripción y precios</LegalH2>
        <LegalP>
          El acceso completo al Servicio requiere una suscripción de pago activa, facturada a través de la
          pasarela Stripe. Existen dos modalidades principales (precios en euros, IVA no incluido salvo
          indicación expresa en el checkout):
        </LegalP>
        <div className="grid sm:grid-cols-2 gap-4 not-prose">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Plan Básico</p>
            <p className="text-xl font-black text-slate-900">49 € / mes</p>
            <p className="text-xs text-slate-500 font-medium mt-1 mb-3">También denominado «Plan Autónomo» en la interfaz.</p>
            <LegalUl items={[
              'Escáner OCR de facturas/tickets',
              'Libro Mayor y exportación',
              'Facturación PDF y presupuestos',
              'Modelos trimestrales orientativos (p. ej. 303 y 130)',
            ]} />
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Plan Premium</p>
            <p className="text-xl font-black text-slate-900">89 € / mes</p>
            <p className="text-xs text-slate-500 font-medium mt-1 mb-3">También denominado «Plan Empresa Pro» en la interfaz.</p>
            <LegalUl items={[
              'Todo lo incluido en el Plan Básico',
              'Análisis avanzado / CFO virtual',
              'Modelos fiscales ampliados (p. ej. 390, 115, 111, 347, 349)',
              'Soporte VIP prioritario',
            ]} />
          </div>
        </div>
        <LegalP>
          El Prestador podrá ofrecer periodos de prueba, descuentos o cambios de precio con preaviso
          razonable. El precio aplicable será el mostrado en el momento del checkout. El upgrade entre
          planes podrá prorratearse automáticamente por el procesador de pagos.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>3. Política de no reembolsos y cancelación</LegalH2>
        <LegalP>
          <strong>Política estricta de no reembolsos (B2B).</strong> Al tratarse de un software profesional
          de prestación continua (SaaS B2B) y de un servicio digital cuyo acceso se habilita de forma
          inmediata, el Cliente reconoce que <strong>no tiene derecho a reembolso</strong> de las cuotas
          ya abonadas, incluidas las del periodo de facturación en curso, salvo obligación legal imperativa
          en contrario.
        </LegalP>
        <LegalP>
          <strong>Cancelación libre.</strong> El Cliente puede cancelar su suscripción en cualquier momento
          desde el portal de facturación / gestión de suscripción. La cancelación producirá efectos al
          finalizar el periodo de facturación ya pagado: el Cliente mantendrá el acceso hasta esa fecha y
          <strong> no se renovará automáticamente el mes siguiente</strong>. No se generarán cargos futuros
          tras la cancelación efectiva.
        </LegalP>
        <LegalUl items={[
          'No se reembolsan periodos parciales ni «días no usados».',
          'No se reembolsan por insatisfacción subjetiva, error de configuración del Cliente o falta de uso.',
          'Los cargos disputados de forma fraudulenta podrán comportar la suspensión inmediata de la cuenta.',
        ]} />
      </section>

      <LegalAlert title="4. Cláusula Escudo — Exención de responsabilidad fiscal y tecnológica">
        <p>
          <strong>4.1. Naturaleza del Servicio.</strong> TaxGuard AI es exclusivamente una{' '}
          <strong>«herramienta tecnológica de asistencia»</strong>. Los resultados del OCR (lectura
          automática de tickets y facturas), la clasificación contable, los indicadores financieros, el
          chat/analítica con IA y los <strong>borradores de modelos tributarios</strong> tienen carácter
          <strong> orientativo y automatizado</strong>. No constituyen asesoramiento fiscal vinculante ni
          declaración tributaria oficial.
        </p>
        <p>
          <strong>4.2. Responsabilidad exclusiva del Usuario.</strong> La responsabilidad{' '}
          <strong>última y final</strong> de (i) revisar que los datos extraídos por el OCR son correctos e
          íntegros; (ii) verificar importes, bases, IVA, retenciones, fechas, NIF/CIF y numeración; (iii)
          contrastar los borradores con la normativa y con su situación real; y (iv){' '}
          <strong>presentar los modelos y efectuar el pago a la Agencia Tributaria (Hacienda) u otros
          organismos</strong>, recae <strong>EXCLUSIVAMENTE en el Usuario / Cliente</strong> o en el
          asesor fiscal que él designe.
        </p>
        <p>
          <strong>4.3. Exclusión de responsabilidad del Prestador.</strong> En la máxima medida permitida
          por la ley aplicable, TaxGuard AI, sus titulares, empleados, colaboradores y licenciatarios{' '}
          <strong>no se hacen responsables</strong> de sanciones, recargos, intereses de demora, multas
          fiscales, requerimientos de la AEAT, ni de pérdidas económicas, lucro cesante, daño emergente,
          pérdida de datos o reputación derivados de: errores o imprecisiones del software; fallos,
          omisiones o interpretaciones erróneas del OCR o de la IA; configuración incorrecta del espacio
          de trabajo; despistes, falta de revisión o uso indebido por parte del Usuario; o decisiones
          empresariales basadas en la información mostrada en la Plataforma.
        </p>
        <p>
          <strong>4.4. Deber de diligencia.</strong> El Cliente se obliga a revisar manualmente todo
          asiento, factura, borrador y exportación antes de su uso oficial. El uso del Servicio implica
          la aceptación expresa de esta Cláusula Escudo.
        </p>
      </LegalAlert>

      <section className="space-y-3">
        <LegalH2>5. Cuenta de usuario, espacios de trabajo y Modo Asesor</LegalH2>
        <LegalP>
          El Cliente es responsable de la confidencialidad de sus credenciales y de toda actividad
          realizada bajo su cuenta. Podrá crear espacios de trabajo y, en su caso, invitar a asesores
          en modo lectura según las funcionalidades disponibles. El Cliente garantiza que dispone de
          legitimación para cargar documentos y datos de terceros (clientes/proveedores) en la Plataforma.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>6. Uso aceptable y prohibiciones</LegalH2>
        <LegalUl items={[
          'Queda prohibido el uso del Servicio para actividades ilícitas, blanqueo de capitales o evasión fiscal.',
          'No está permitido realizar ingeniería inversa, scrapear, sobrecargar dolosamente la API/IA ni revender el acceso sin autorización.',
          'El Cliente no introducirá malware ni intentará vulnerar medidas de seguridad.',
          'El Prestador podrá suspender cuentas ante indicios fundados de abuso, impago o riesgo legal.',
        ]} />
      </section>

      <section className="space-y-3">
        <LegalH2>7. Propiedad intelectual</LegalH2>
        <LegalP>
          La Plataforma, su código, marca, diseño, documentación y modelos de IA asociados son
          propiedad del Prestador o de sus licenciantes. El Cliente conserva la titularidad sobre los
          datos y documentos que cargue. Se concede al Cliente una licencia limitada, no exclusiva,
          intransferible y revocable para usar el Servicio durante la suscripción activa.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>8. Datos personales y documentos</LegalH2>
        <LegalP>
          El tratamiento de datos personales se rige por la{' '}
          <Link href="/legal/privacy" className="text-blue-600 font-bold hover:underline">Política de Privacidad</Link>.
          El Cliente actúa, en muchos casos, como responsable del tratamiento de los datos de sus
          propios clientes/proveedores introducidos en TaxGuard AI; el Prestador actúa como encargado
          del tratamiento para la prestación del Servicio, conforme al RGPD.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>9. Disponibilidad, IA y limitaciones técnicas</LegalH2>
        <LegalP>
          El Prestador procura una disponibilidad alta del Servicio, sin garantizar un uptime del 100%.
          Las funciones de IA (OCR, chat, análisis) pueden producir resultados incompletos o erróneos.
          El Cliente acepta utilizarlas bajo su propia supervisión. El Prestador podrá modificar,
          mejorar o discontinuar funcionalidades con preaviso razonable cuando sea posible.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>10. Limitación de responsabilidad económica</LegalH2>
        <LegalP>
          Sin perjuicio de la Cláusula Escudo, y salvo dolo o negligencia grave no excluible por ley,
          la responsabilidad agregada del Prestador frente al Cliente por cualquier reclamación
          relacionada con el Servicio en un periodo de doce (12) meses no excederá el importe total
          efectivamente abonado por el Cliente al Prestador en esos doce meses.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>11. Duración y resolución</LegalH2>
        <LegalP>
          El contrato se renueva automáticamente por periodos mensuales mientras exista suscripción
          activa. Además de la cancelación por el Cliente, el Prestador podrá resolver el contrato por
          incumplimiento grave, impago o uso ilícito, sin perjuicio de reclamar daños.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>12. Legislación aplicable y fuero</LegalH2>
        <LegalP>
          Estos Términos se rigen por la legislación española y, en lo aplicable, por el Derecho de la
          Unión Europea. Para la resolución de controversias, las partes se someten a los juzgados y
          tribunales del domicilio del Prestador, salvo norma imperativa de protección del consumidor
          que resulte aplicable (sin perjuicio de que el Servicio se dirige prioritariamente a
          profesionales B2B).
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>13. Contacto</LegalH2>
        <LegalP>
          Para cuestiones legales o contractuales: <strong>soporte.taxguard@gmail.com</strong> ·
          Tel. <strong>+34 635 997 325</strong> · Calle Palomar nº 51, 21860 Villalba del Alcor,
          Huelva, España ·{' '}
          <a
            href="https://www.taxguard-ai.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-bold hover:underline"
          >
            https://www.taxguard-ai.com/
          </a>
          .
        </LegalP>
      </section>
    </LegalPageShell>
  );
}
