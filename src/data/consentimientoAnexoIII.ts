/**
 * Plantilla editable — Anexo III consentimiento informado bilateral (Ley 26.529, Res. SSS 561/2014, marco Ley 27.350).
 * El club la entrega al paciente; el firmado se archiva en el perfil (Documentos).
 *
 * Soporta placeholders {{NOMBRE_PACIENTE}}, {{DNI_PACIENTE}}, {{DOMICILIO_PACIENTE}},
 * {{HISTORIA_CLINICA}}, {{NOMBRE_PROFESIONAL}}, {{DNI_PROFESIONAL}}, {{MATRICULA_PROFESIONAL}},
 * {{REPROCANN_CODE}}, {{REPROCANN_EXPIRES}}, {{FECHA}}, {{LUGAR}} — sustituidos antes de render.
 */
export const CONSENTIMIENTO_ANEXO_III_TEMPLATE = `ANEXO III CONSENTIMIENTO INFORMADO BILATERAL

Entre el Sr. / Sra. {{NOMBRE_PACIENTE}}, DNI {{DNI_PACIENTE}}, con domicilio real en {{DOMICILIO_PACIENTE}}, Historia Clínica N° {{HISTORIA_CLINICA}}, por sí/representada por {{NOMBRE_PACIENTE}}, en adelante "EL/LA PACIENTE", por una parte; y el Dr./Dra. {{NOMBRE_PROFESIONAL}}, DNI {{DNI_PROFESIONAL}}, Matrícula {{MATRICULA_PROFESIONAL}}, en adelante "EL/LA PROFESIONAL", por el otro, convienen en celebrar el presente acuerdo de consentimiento informado de acuerdo a lo dispuesto por la Ley 26.529, modificada por la Ley Nº 26.742, conforme los términos establecidos en la Resolución de la Súper Intendencia de Seguros de Salud N° 561/2014, sujeto a las siguientes cláusulas:

PRIMERO: EL/LA PROFESIONAL luego de la evaluación del paciente informa que éste padece:

……………………………………………………………………………………………

(EL/LA PROFESIONAL deberá consignar la naturaleza de la patología y su evolución)

REPROCANN: Código {{REPROCANN_CODE}} · Vencimiento {{REPROCANN_EXPIRES}}

SEGUNDO: EL/LA PROFESIONAL propone para el tratamiento de la patología detallada en el artículo primero realizar el siguiente tratamiento:

………………………………………………………………….........................................

(EL/LA PROFESIONAL deberá consignar en qué consiste el procedimiento propuesta y cómo se llevará a cabo, detallando: cantidad de plantas, dosis, concentración de THC, tipo y frecuencia de analítica requerida, etc.)

Los beneficios razonables del tratamiento propuesta consisten en:

……………………………………………………………….........................................

(EL/LA PROFESIONAL deberá consignar los beneficios que el tratamiento deberían traer, conforme la patología detallada)

Las consecuencias de la denegación por parte del paciente son:

……………………………………………………………….........................................

(EL/LA PROFESIONAL deberá consignar qué consecuencias tendrá el paciente en caso de negarse a recibir el tratamiento propuesto).

Los riesgos del tratamiento son:

……………………………………….........................................

(EL/LA PROFESIONAL deberá consignar los todos los riesgos, complicaciones y efectos adversos que pueda tener el paciente al recibir el tratamiento

TERCERO: EL/LA PACIENTE declara haber tomado conocimiento y entendido todo lo consignado por el EL/LA PROFESIONAL, médico tratante. Asimismo, declara haber tenido la oportunidad de realizar todas las preguntas que necesitó para tomar libremente la presente decisión.

CUARTO: EL/LA PROFESIONAL informó y EL/LA PACIENTE aceptó y comprendió que el aceite de cannabis y sus derivados, para uso medicinal, resultantes de la práctica del cultivo no constituye un medicamento, sustancia y/o producto autorizado y aprobado por la Administración Nacional de Medicamentos, Alimentos y Tecnología (ANMAT), única autoridad regulatoria nacional con competencia para habilitar el registro.

QUINTA: EL/LA PACIENTE y EL/LA PROFESIONAL se compromete a cumplir con los requerimientos establecidos por la autoridad de Aplicación de la Ley 27.350 y su Decreto Reglamentario 883/2020, sus modificatorias y complementarias y toda aquella norma que pudiera reemplazarla.

SEXTA: EL/LA PACIENTE tendrá derecho a revocar este consentimiento informado de conformidad con lo dispuesto por el artículo 10 de la Ley 26.529.

SÉPTIMA — TRATAMIENTO DE DATOS PERSONALES (Ley 25.326):

7.1. Responsable del tratamiento. El club identificado en el encabezado actúa como responsable del tratamiento de los datos personales de EL/LA PACIENTE, con domicilio legal disponible a requerimiento. Toda consulta o ejercicio de derechos puede dirigirse al canal de contacto institucional del club.

7.2. Datos recolectados. Se recolectan: nombre y apellido, DNI, domicilio, teléfono y/o WhatsApp, correo electrónico, código REPROCANN y vencimiento, datos de su profesional tratante, historia clínica, prescripción y datos sensibles de salud vinculados al tratamiento (Ley 25.326 art. 2 y 7), evidencia técnica de consentimiento (dirección IP, dispositivo / user-agent, fecha y hora, hash del documento aceptado).

7.3. Finalidades. (a) cumplir con la Ley 27.350, su decreto reglamentario y normativa REPROCANN; (b) gestionar la asociación al club, dispensaciones, aportes y trazabilidad legal del cultivo; (c) llevar registros médicos exigidos por la Ley 26.529; (d) cumplir requerimientos de autoridades públicas competentes; (e) generar prueba de la firma electrónica (Ley 25.506) y del consentimiento informado.

7.4. Base de licitud y consentimiento expreso para datos sensibles. Tratándose de datos sensibles de salud, EL/LA PACIENTE presta consentimiento libre, expreso e informado para su tratamiento, conforme art. 7 inc. 3 de la Ley 25.326.

7.5. Cesión y transferencia a terceros. EL/LA PACIENTE consiente expresamente la comunicación o cesión de sus datos personales —incluidos los datos sensibles indispensables— a las siguientes categorías de destinatarios, sólo cuando resulte necesario para cumplir las finalidades del punto 7.3:

   (a) Profesional médico tratante y, en su caso, equipo de salud que lo acompañe;
   (b) Autoridad sanitaria nacional y autoridades del REPROCANN (Ministerio de Salud);
   (c) ANMAT y demás autoridades regulatorias o judiciales que lo requieran formalmente;
   (d) Proveedores de infraestructura tecnológica que el club utiliza bajo contrato (alojamiento de base de datos en la nube, servicios de mensajería, autenticación), obligados por confidencialidad y a tratar los datos sólo bajo instrucción del club (art. 25 Ley 25.326);
   (e) Otros socios/profesionales del club exclusivamente en lo necesario para el funcionamiento operativo (p. ej. trazabilidad de lotes, control de cupos).

   Fuera de estos supuestos, no se cederán datos a terceros sin nuevo consentimiento. No se prevé transferencia internacional de datos a países sin nivel adecuado de protección; si esto cambiara, se requerirá un consentimiento específico adicional.

7.6. Plazo de conservación. Los datos se conservarán mientras dure la relación con el club y, una vez finalizada, por los plazos mínimos exigidos por la Ley 26.529 (10 años para historia clínica) y demás normativa aplicable. Vencidos esos plazos serán bloqueados y/o suprimidos.

7.7. Derechos del titular (Ley 25.326 arts. 14 a 16). EL/LA PACIENTE puede ejercer en forma gratuita los derechos de acceso, rectificación, actualización, supresión y, cuando corresponda, oposición sobre sus datos. La revocación del consentimiento es libre y opera hacia el futuro, sin afectar la licitud del tratamiento previo.

7.8. Seguridad. El club aplica medidas técnicas y organizativas razonables para proteger los datos contra acceso, pérdida o alteración no autorizados, incluyendo control de acceso por roles, conexiones cifradas (HTTPS) y registro de auditoría.

7.9. Autoridad de control. EL/LA PACIENTE tiene derecho a presentar reclamos ante la Agencia de Acceso a la Información Pública (AAIP), órgano de control de la Ley 25.326, en caso de considerar afectados sus derechos.

OCTAVA — FIRMA ELECTRÓNICA (Ley 25.506): la aceptación de este documento mediante el botón de confirmación constituye firma electrónica en los términos del art. 5 de la Ley 25.506. EL/LA PACIENTE reconoce que la marca temporal, dirección IP, identificación de dispositivo y hash del documento conforman la prueba del acto, y consiente su almacenamiento como evidencia.

Se firman 2 (dos) ejemplares del presente de un mismo tenor en {{LUGAR}} a los {{FECHA}}.

Firma y Aclaración de EL/LA PROFESIONAL

Firma y Aclaración EL/LA PACIENTE
`

export const CONSENTIMIENTO_ANEXO_III_FILENAME =
  'ANEXO_III_consentimiento_informado_bilateral_plantilla.txt'

/** Ruta servida por Vite desde `public/templates/` (archivo físico en el repo). */
export function getConsentimientoAnexoIIIPublicUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}templates/${CONSENTIMIENTO_ANEXO_III_FILENAME}`
}

export type ConsentimientoVars = {
  nombrePaciente?: string
  dniPaciente?: string
  domicilioPaciente?: string
  historiaClinica?: string
  nombreProfesional?: string
  dniProfesional?: string
  matriculaProfesional?: string
  reprocannCode?: string
  reprocannExpires?: string
  lugar?: string
  fecha?: string
}

const PLACEHOLDER = '________________'

function fmtDateLong(iso?: string): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function renderConsentimientoAnexoIII(vars: ConsentimientoVars): string {
  const map: Record<string, string> = {
    '{{NOMBRE_PACIENTE}}': vars.nombrePaciente?.trim() || PLACEHOLDER,
    '{{DNI_PACIENTE}}': vars.dniPaciente?.trim() || PLACEHOLDER,
    '{{DOMICILIO_PACIENTE}}': vars.domicilioPaciente?.trim() || PLACEHOLDER,
    '{{HISTORIA_CLINICA}}': vars.historiaClinica?.trim() || PLACEHOLDER,
    '{{NOMBRE_PROFESIONAL}}': vars.nombreProfesional?.trim() || PLACEHOLDER,
    '{{DNI_PROFESIONAL}}': vars.dniProfesional?.trim() || PLACEHOLDER,
    '{{MATRICULA_PROFESIONAL}}': vars.matriculaProfesional?.trim() || PLACEHOLDER,
    '{{REPROCANN_CODE}}': vars.reprocannCode?.trim() || PLACEHOLDER,
    '{{REPROCANN_EXPIRES}}': fmtDateLong(vars.reprocannExpires) || PLACEHOLDER,
    '{{LUGAR}}': vars.lugar?.trim() || PLACEHOLDER,
    '{{FECHA}}': vars.fecha?.trim() || fmtDateLong(new Date().toISOString().slice(0, 10)) || PLACEHOLDER,
  }
  let out = CONSENTIMIENTO_ANEXO_III_TEMPLATE
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v)
  }
  return out
}
