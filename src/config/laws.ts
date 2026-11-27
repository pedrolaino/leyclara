// To add a law: add it here, then run npm run ingest -- --fetch.

export type AreaId = "trabajo" | "consumo" | "transito";

export interface LawSource {
  id: string;
  area: AreaId;
  number: string;
  name: string;
  shortName: string;
  infolegId: number;
  // texact.htm is the updated text, norma.htm is the original
  textUrl: string;
  pageUrl: string;
}

export interface Area {
  id: AreaId;
  title: string;
  lawIds: string[];
  examples: string[];
  // Small line shown under every answer in this area
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
    lawIds: ["lct"],
    examples: [
      "¿Cuántos días de vacaciones me corresponden?",
      "¿Qué me tienen que pagar si me despiden?",
      "¿Cuándo me pagan el aguinaldo?",
    ],
    referral:
      "Para tu caso, consultá con un abogado laboralista, tu sindicato o la oficina de trabajo de tu provincia. Tu convenio colectivo puede darte más derechos que la ley.",
  },
  {
    id: "consumo",
    title: "Compras",
    lawIds: ["ldc"],
    examples: [
      "¿Qué hago si un producto vino fallado?",
      "¿Puedo devolver una compra por internet?",
      "¿Cuánto dura la garantía?",
    ],
    referral:
      "Si querés reclamar, la oficina de Defensa del Consumidor de tu municipio o provincia recibe denuncias. También podés consultar con un abogado.",
  },
  {
    id: "transito",
    title: "Tránsito",
    lawIds: ["lnt"],
    examples: [
      "¿Qué documentos necesito para manejar?",
      "¿Cuál es la velocidad máxima en autopista?",
      "¿Pueden retenerme el auto en un control?",
    ],
    referral:
      "Cada provincia y municipio puede tener sus propias normas de tránsito. Si te labraron un acta, consultá en el juzgado de faltas que la tramita o con un abogado.",
  },
];

export const lawById = (id: string) => LAWS.find((l) => l.id === id);
export const areaById = (id: AreaId) => AREAS.find((a) => a.id === id)!;
