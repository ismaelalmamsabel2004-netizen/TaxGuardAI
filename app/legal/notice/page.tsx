import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageShell, { LegalAlert, LegalH2, LegalP, LegalUl } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Aviso Legal',
  description: 'Aviso Legal de TaxGuard AI conforme a la LSSI-CE y normativa aplicable.',
};

export default function NoticePage() {
  return (
    <LegalPageShell
      title="Aviso Legal"
      subtitle="Información general del prestador de servicios de la sociedad de la información conforme a la Ley 34/2002 (LSSI-CE)."
    >
      <LegalAlert title="Situación actual del prestador">
        <p>
          TaxGuard AI opera actualmente bajo el nombre comercial <strong>TaxGuard AI</strong>. El
          alta como autónomo / NIF fiscal está <strong>pendiente</strong> y se actualizará en este
          Aviso Legal en cuanto se formalice.
        </p>
      </LegalAlert>

      <section className="space-y-3">
        <LegalH2>1. Datos identificativos del prestador</LegalH2>
        <LegalP>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la
          Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los
          siguientes datos:
        </LegalP>
        <LegalUl
          items={[
            <>
              <strong>Denominación / titular:</strong> TaxGuard AI
            </>,
            <>
              <strong>Nombre comercial:</strong> TaxGuard AI
            </>,
            <>
              <strong>NIF/CIF:</strong> Pendiente de alta como autónomo (se publicará aquí tras el
              alta en Hacienda)
            </>,
            <>
              <strong>Domicilio:</strong> Calle Palomar nº 51, 21860 Villalba del Alcor, Huelva,
              España
            </>,
            <>
              <strong>Inscripción registral:</strong> N/A (no inscrito en Registro Mercantil; alta
              de autónomo pendiente)
            </>,
            <>
              <strong>Correo electrónico de contacto:</strong> soporte.taxguard@gmail.com
            </>,
            <>
              <strong>Teléfono:</strong> +34 635 997 325
            </>,
            <>
              <strong>Sitio web:</strong>{' '}
              <a
                href="https://www.taxguard-ai.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-bold hover:underline"
              >
                https://www.taxguard-ai.com/
              </a>
            </>,
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>2. Objeto</LegalH2>
        <LegalP>
          El presente Aviso Legal regula el acceso, navegación y uso del sitio web y de la
          plataforma SaaS TaxGuard AI (el «Sitio»), así como las responsabilidades derivadas de su
          utilización.
        </LegalP>
        <LegalP>
          TaxGuard AI ofrece herramientas tecnológicas de asistencia para la gestión contable y la
          preparación de borradores fiscales.{' '}
          <strong>
            No constituye asesoramiento fiscal personalizado ni sustituye a un profesional
            colegiado
          </strong>
          , salvo que se contrate expresamente un servicio adicional de esa naturaleza.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>3. Condiciones de acceso y uso</LegalH2>
        <LegalP>
          El acceso al Sitio atribuye la condición de usuario e implica la aceptación plena de este
          Aviso Legal, de los{' '}
          <Link href="/legal/terms" className="text-blue-600 font-bold hover:underline">
            Términos y Condiciones
          </Link>{' '}
          y de la{' '}
          <Link href="/legal/privacy" className="text-blue-600 font-bold hover:underline">
            Política de Privacidad
          </Link>
          .
        </LegalP>
        <LegalUl
          items={[
            'El Usuario se compromete a un uso lícito, diligente y conforme a la buena fe.',
            'Queda prohibido el uso del Sitio con fines ilícitos, lesivos de derechos de terceros o que puedan dañar, sobrecargar o deteriorar el Servicio.',
            'El Usuario es responsable de la veracidad de los datos que facilite y de la custodia de sus credenciales de acceso.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>4. Propiedad intelectual e industrial</LegalH2>
        <LegalP>
          Todos los contenidos del Sitio (textos, diseños, logotipos, software, bases de datos,
          interfaz, documentación y marcas, incluido «TaxGuard AI») son titularidad de TaxGuard AI
          o de terceros licenciantes, y están protegidos por la normativa de propiedad intelectual e
          industrial.
        </LegalP>
        <LegalP>
          Queda prohibida la reproducción, distribución, comunicación pública, transformación o
          cualquier otra forma de explotación no autorizada expresamente por escrito.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>5. Enlaces a terceros</LegalH2>
        <LegalP>
          El Sitio puede incluir enlaces a sitios de terceros (p. ej. pasarelas de pago,
          documentación oficial de la AEAT). TaxGuard AI no controla ni asume responsabilidad por el
          contenido, políticas o prácticas de dichos sitios.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>6. Exclusión de responsabilidad</LegalH2>
        <LegalP>
          Sin perjuicio de lo dispuesto en los Términos y Condiciones (incluida la Cláusula Escudo),
          TaxGuard AI:
        </LegalP>
        <LegalUl
          items={[
            'No garantiza la disponibilidad ininterrumpida del Sitio ni la ausencia total de errores.',
            'No responde de daños derivados del uso indebido del Sitio, de fallos de conectividad del Usuario, ni de decisiones adoptadas exclusivamente sobre la base de borradores o extracciones automáticas.',
            'La responsabilidad última sobre la exactitud de los datos fiscales y su presentación ante la Administración Tributaria recae en el Usuario.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>7. Protección de datos</LegalH2>
        <LegalP>
          El tratamiento de datos personales se rige por la{' '}
          <Link href="/legal/privacy" className="text-blue-600 font-bold hover:underline">
            Política de Privacidad
          </Link>{' '}
          publicada en este Sitio, conforme al RGPD y la LOPDGDD.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>8. Legislación aplicable y jurisdicción</LegalH2>
        <LegalP>
          Este Aviso Legal se rige por la legislación española. Para la resolución de
          controversias, las partes se someten a los Juzgados y Tribunales de{' '}
          <strong>Huelva</strong>, con renuncia a cualquier otro fuero que pudiera
          corresponderles, salvo normas imperativas de protección de consumidores que resulten de
          aplicación (el Servicio se dirige principalmente a profesionales B2B).
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>9. Contacto</LegalH2>
        <LegalP>
          Para cualquier comunicación legal relativa a este Aviso:{' '}
          <strong>soporte.taxguard@gmail.com</strong> · <strong>TaxGuard AI</strong> · Calle
          Palomar nº 51, 21860 Villalba del Alcor, Huelva, España · Tel.{' '}
          <strong>+34 635 997 325</strong>.
        </LegalP>
      </section>
    </LegalPageShell>
  );
}
