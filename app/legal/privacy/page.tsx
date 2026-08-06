import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPageShell, { LegalAlert, LegalH2, LegalP, LegalUl } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Política de Privacidad de TaxGuard AI conforme al RGPD (UE) 2016/679 y la LOPDGDD.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Política de Privacidad"
      subtitle="Información sobre el tratamiento de datos personales conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD)."
    >
      <LegalAlert title="Compromiso de minimización y finalidad">
        <p>
          Los datos de facturas, tickets y extracciones OCR se tratan exclusivamente para prestar el
          Servicio de asistencia contable y fiscal. <strong>No se venden a terceros</strong> ni se
          utilizan para publicidad comportamental.
        </p>
      </LegalAlert>

      <section className="space-y-3">
        <LegalH2>1. Responsable del tratamiento</LegalH2>
        <LegalP>
          El responsable del tratamiento es <strong>[NOMBRE EMPRESA]</strong>, con NIF/CIF{' '}
          <strong>[CIF/NIF]</strong>, domicilio en <strong>[DIRECCIÓN COMPLETA]</strong>, e-mail de
          contacto en materia de protección de datos: <strong>[EMAIL PRIVACIDAD]</strong> (en
          adelante, el «Responsable»).
        </LegalP>
        <LegalP>
          En su caso, podrá designarse un Delegado de Protección de Datos (DPD/DPO) en{' '}
          <strong>[EMAIL DPO / N/A]</strong>.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>2. Ámbito de aplicación</LegalH2>
        <LegalP>
          Esta Política describe cómo TaxGuard AI trata datos personales en el contexto de su SaaS
          B2B dirigido a autónomos y empresas (clientes profesionales). Cubre:
        </LegalP>
        <LegalUl
          items={[
            'Datos de cuenta y facturación de la suscripción.',
            'Datos contenidos en facturas, tickets, extractos y documentos subidos o capturados mediante OCR/IA.',
            'Datos de contactos CRM (clientes/proveedores) introducidos por el Usuario.',
            'Datos técnicos de uso (logs, identificadores de sesión, métricas de rendimiento) necesarios para seguridad y mejora del Servicio.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>3. Categorías de datos tratados</LegalH2>
        <LegalUl
          items={[
            <>
              <strong>Identificativos y de contacto:</strong> nombre, e-mail, teléfono, razón social,
              NIF/CIF, dirección fiscal.
            </>,
            <>
              <strong>Datos de cuenta:</strong> identificadores de autenticación (p. ej. Clerk), plan
              contratado, estado de suscripción.
            </>,
            <>
              <strong>Datos de pago:</strong> gestionados principalmente por Stripe; TaxGuard AI no
              almacena números completos de tarjeta.
            </>,
            <>
              <strong>Datos financieros y documentales:</strong> importes, bases imponibles, cuotas
              de IVA/IRPF, fechas, conceptos, NIF de terceros, imágenes/PDF de tickets y facturas,
              texto extraído por OCR.
            </>,
            <>
              <strong>Datos de terceros:</strong> cuando el Usuario introduce información de sus
              clientes o proveedores, actúa como responsable de dichos datos frente a ellos; TaxGuard
              AI actúa como encargado del tratamiento respecto de esos datos.
            </>,
            <>
              <strong>Datos técnicos:</strong> dirección IP, user-agent, logs de acceso, eventos de
              error y métricas de uso agregadas.
            </>,
          ]}
        />
        <LegalP>
          El Servicio <strong>no está diseñado</strong> para tratar categorías especiales del art. 9
          RGPD (salud, ideología, etc.). El Usuario se compromete a no subir documentos que contengan
          tales datos salvo que exista una base legal propia y haya informado al Responsable.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>4. Finalidades y bases jurídicas</LegalH2>
        <LegalUl
          items={[
            <>
              <strong>Prestación del Servicio</strong> (cuenta, OCR, libro mayor, borradores
              fiscales, CRM, soporte): ejecución del contrato (art. 6.1.b RGPD).
            </>,
            <>
              <strong>Facturación y cobro de la suscripción:</strong> ejecución del contrato y
              obligación legal (arts. 6.1.b y 6.1.c RGPD).
            </>,
            <>
              <strong>Seguridad, prevención de fraude y abuso:</strong> interés legítimo (art. 6.1.f
              RGPD) y, en su caso, obligación legal.
            </>,
            <>
              <strong>Comunicaciones de servicio</strong> (avisos de pago, cambios contractuales,
              incidencias): ejecución del contrato e interés legítimo.
            </>,
            <>
              <strong>Mejora del producto</strong> (métricas agregadas, depuración): interés
              legítimo, sin vender datos personales.
            </>,
            <>
              <strong>Marketing B2B</strong> (si se realiza): consentimiento o interés legítimo
              conforme a la LSSI-CE, con derecho de oposición.
            </>,
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>5. Tratamiento de facturas, tickets y OCR/IA</LegalH2>
        <LegalP>
          Cuando el Usuario sube o captura un documento, TaxGuard AI lo procesa mediante tecnologías
          de OCR e inteligencia artificial (incluido, en su caso, proveedores de modelos de IA) con
          la única finalidad de <strong>extraer campos contables/fiscales</strong> y generar
          borradores dentro del Servicio.
        </LegalP>
        <LegalUl
          items={[
            'Los documentos y extracciones se asocian a la cuenta del Usuario y se almacenan mientras sea necesario para prestar el Servicio o cumplir obligaciones legales.',
            'El Usuario es responsable de la licitud de los documentos que sube y de informar a sus propios clientes/proveedores cuando corresponda.',
            <>
              TaxGuard AI <strong>no presenta modelos ante la AEAT</strong> ni sustituye la revisión
              humana; véase la Cláusula Escudo en los{' '}
              <Link href="/legal/terms" className="text-blue-600 font-bold hover:underline">
                Términos y Condiciones
              </Link>
              .
            </>,
            'No se utilizan los contenidos de facturas del Usuario para entrenar modelos de IA de terceros con fines ajenos al Servicio, salvo que se informe expresamente y exista base jurídica o contrato de encargado/subencargado adecuado.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>6. Destinatarios y encargados del tratamiento</LegalH2>
        <LegalP>
          Podrán acceder a datos personales proveedores que actúan como encargados o subencargados,
          bajo contratos conformes al art. 28 RGPD, entre otros:
        </LegalP>
        <LegalUl
          items={[
            <>
              <strong>Autenticación:</strong> Clerk (gestión de identidad y sesión).
            </>,
            <>
              <strong>Pagos:</strong> Stripe (procesamiento de suscripciones).
            </>,
            <>
              <strong>Infraestructura / base de datos:</strong> proveedores cloud (hosting,
              PostgreSQL/Prisma) en la UE o con garantías adecuadas.
            </>,
            <>
              <strong>IA / OCR:</strong> proveedores de modelos y APIs de procesamiento documental
              necesarios para la extracción de datos.
            </>,
            <>
              <strong>Comunicaciones:</strong> proveedores de e-mail transaccional, en su caso.
            </>,
          ]}
        />
        <LegalP>
          También podrán comunicarse datos a Administraciones Públicas (incluida la AEAT) cuando
          exista obligación legal. No se cederán datos a terceros para fines comerciales propios de
          dichos terceros.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>7. Transferencias internacionales</LegalH2>
        <LegalP>
          Algunos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En tal caso,
          el Responsable aplicará las garantías del Capítulo V del RGPD (decisiones de adecuación,
          Cláusulas Contractuales Tipo u otras medidas equivalentes) y, cuando proceda, medidas
          suplementarias.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>8. Plazos de conservación</LegalH2>
        <LegalUl
          items={[
            <>
              <strong>Cuenta activa:</strong> mientras dure la relación contractual y sea necesario
              para prestar el Servicio.
            </>,
            <>
              <strong>Tras la baja:</strong> datos de cuenta y documentos podrán eliminarse o
              anonimizarse en un plazo razonable (orientativamente, hasta 30–90 días), salvo bloqueo
              por reclamaciones.
            </>,
            <>
              <strong>Facturación y obligaciones mercantiles/fiscales:</strong> hasta 6 años (o el
              plazo legal aplicable) en bloqueo/archivo.
            </>,
            <>
              <strong>Logs de seguridad:</strong> el tiempo mínimo necesario para detectar e
              investigar incidencias.
            </>,
          ]}
        />
      </section>

      <section className="space-y-3">
        <LegalH2>9. Medidas de seguridad</LegalH2>
        <LegalP>
          Se aplican medidas técnicas y organizativas apropiadas al riesgo, incluyendo control de
          acceso, cifrado en tránsito (HTTPS/TLS), segregación de entornos, registro de eventos
          relevantes y principios de minimización. Ningún sistema es 100 % seguro; el Usuario debe
          proteger sus credenciales y dispositivos.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>10. Derechos de las personas interesadas</LegalH2>
        <LegalP>
          Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del
          tratamiento, portabilidad y, cuando el tratamiento se base en consentimiento, su
          retirada, dirigiendo una solicitud a <strong>[EMAIL PRIVACIDAD]</strong>, aportando prueba
          de identidad cuando sea necesario.
        </LegalP>
        <LegalP>
          Asimismo, tiene derecho a reclamar ante la Agencia Española de Protección de Datos (AEPD):{' '}
          <a
            href="https://www.aepd.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-bold hover:underline"
          >
            www.aepd.es
          </a>
          .
        </LegalP>
        <LegalP>
          Si el Usuario es responsable respecto de datos de terceros introducidos en TaxGuard AI,
          deberá gestionar las solicitudes de esos interesados y, cuando proceda, coordinarse con el
          Responsable como encargado.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>11. Cookies y tecnologías similares</LegalH2>
        <LegalP>
          TaxGuard AI puede utilizar cookies técnicas y de sesión imprescindibles para autenticación
          y seguridad. En su caso, las cookies no esenciales se gestionarán conforme a la normativa
          aplicable y, cuando sea necesario, mediante consentimiento.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>12. Menores</LegalH2>
        <LegalP>
          El Servicio se dirige a profesionales y empresas. No está destinado a menores de 18 años.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>13. Actualizaciones</LegalH2>
        <LegalP>
          Esta Política puede actualizarse para reflejar cambios legales o del Servicio. La versión
          vigente se publicará en esta URL con indicación de la fecha de actualización. Los cambios
          sustanciales se comunicarán cuando proceda.
        </LegalP>
      </section>

      <section className="space-y-3">
        <LegalH2>14. Contacto</LegalH2>
        <LegalP>
          Para cualquier consulta sobre privacidad: <strong>[EMAIL PRIVACIDAD]</strong> ·{' '}
          <strong>[NOMBRE EMPRESA]</strong> · <strong>[DIRECCIÓN COMPLETA]</strong>. Contacto
          operativo actual: <strong>soporte.taxguard@gmail.com</strong>.
        </LegalP>
      </section>
    </LegalPageShell>
  );
}
