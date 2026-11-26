/**
 * Registro de leyes y áreas. Agregar una ley nueva = agregar una entrada acá,
 * correr `npm run laws:fetch && npm run laws:parse && npm run index:build`.
 */

export type AreaId = "trabajo" | "consumo" | "transito";

export interface LawSource {
  /** Identificador estable, usado en ids de artículos: "lct", "ldc", "lnt". */
  id: string;
  area: AreaId;
  number: string;
  name: string;
  shortName: string;
  /** Id de la norma en InfoLEG. */
  infolegId: number;
  /** URL del texto actualizado (texact.htm), no del texto original. */
  textUrl: string;
  /** Página de la norma en InfoLEG, para enlazar desde el sitio. */
  pageUrl: string;
}

export interface Area {
  id: AreaId;
  title: string;
  subtitle: string;
  lawIds: string[];
  examples: string[];
  /** Línea chica que va debajo de cada respuesta de esta área. */
  referral: string;
}

const infoleg = (range: string, id: number) => ({
  infolegId: id,
  textUrl: `https://servicios.infoleg.gob.ar/infolegInternet/anexos/${range}/${id}/texact.htm`,
  pageUrl: `https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=${id}`,
});

export const LAWS: LawSource[] = [
  {
    id: "lct",
    area: "trabajo",
    number: "20.744",
    name: "Ley de Contrato de Trabajo",
    shortName: "LCT",
    ...infoleg("25000-29999", 25552),
  },
  {
    id: "ldc",
    area: "consumo",
    number: "24.240",
    name: "Ley de Defensa del Consumidor",
    shortName: "LDC",
    ...infoleg("0-4999", 638),
  },
  {
    id: "lnt",
    area: "transito",
    number: "24.449",
    name: "Ley Nacional de Tránsito",
    shortName: "LNT",
    ...infoleg("0-4999", 818),
  },
];

export const AREAS: Area[] = [
  {
    id: "trabajo",
    title: "Trabajo",
    subtitle: "Despidos, sueldo, vacaciones, licencias",
    lawIds: ["lct"],
    examples: [
      "Me despidieron sin causa, ¿qué me tienen que pagar?",
      "¿Cuántos días de vacaciones me corresponden?",
      "¿Cuándo me tienen que pagar el aguinaldo?",
      "¿Cuánto dura el período de prueba?",
    ],
    referral:
      "Para tu caso concreto, consultá con un abogado laboralista, tu sindicato o la autoridad de trabajo de tu jurisdicción. Tu convenio colectivo puede darte más derechos.",
  },
  {
    id: "consumo",
    title: "Compras",
    subtitle: "Garantías, devoluciones, servicios, cobros",
    lawIds: ["ldc"],
    examples: [
      "Compré una heladera y vino fallada, ¿qué puedo hacer?",
      "Compré algo por internet y me arrepentí, ¿lo puedo devolver?",
      "¿Cuánto dura la garantía de un producto nuevo?",
      "Quiero dar de baja un servicio y no me dejan",
    ],
    referral:
      "Para reclamar, podés acudir a la oficina de Defensa del Consumidor de tu municipio o provincia, o consultar con un abogado.",
  },
  {
    id: "transito",
    title: "Tránsito",
    subtitle: "Controles, multas, licencia, velocidad",
    lawIds: ["lnt"],
    examples: [
      "¿Qué documentos tengo que llevar para manejar?",
      "¿Pueden retenerme el auto en un control?",
      "¿Puedo manejar si tomé una cerveza?",
      "¿Cuál es la velocidad máxima en una autopista?",
    ],
    referral:
      "Cada provincia y municipio puede tener normas propias de tránsito. Para una multa o un acta concreta, consultá con la autoridad que la labró o con un abogado.",
  },
];

export const lawById = (id: string) => LAWS.find((l) => l.id === id);
export const areaById = (id: AreaId) => AREAS.find((a) => a.id === id)!;
