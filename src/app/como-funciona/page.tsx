import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/config/site";
import { vigenciaText } from "@/lib/format";
import { getLawSummaries } from "@/lib/laws-summary";

export const metadata: Metadata = { title: "Cómo funciona" };

export default function HowItWorks() {
  const laws = getLawSummaries();
  return (
    <section className="prose">
      <h1>Cómo funciona</h1>
      <p className="lead">
        Escribís tu situación como se la contarías a alguien. {SITE_NAME} busca en el texto de tres leyes, encuentra los
        artículos que aplican y te explica qué dicen.
      </p>

      <h2>Qué leyes usa</h2>
      <ul>
        {laws.map((l) => (
          <li key={l.id}>
            <strong>
              {l.name} ({l.number}).
            </strong>{" "}
            {vigenciaText(l)}.{" "}
            <a href={l.pageUrl} target="_blank" rel="noopener noreferrer">
              Ver en InfoLEG <ExternalLink aria-hidden size={14} />
            </a>
          </li>
        ))}
      </ul>
      <p>
        Se usa el texto actualizado de InfoLEG, que ya incluye las reformas posteriores a cada ley. Cada artículo citado
        muestra el texto oficial y las notas de modificación.
      </p>

      <h2>Qué pasa con tu pregunta</h2>
      <ol>
        <li>
          Si es de un tema que no está cargado, como alquileres, familia, jubilaciones o impuestos, te decimos dónde se
          regula y a quién consultar.
        </li>
        <li>
          Si no, se busca en las tres leyes a la vez. Antes, las palabras de todos los días se traducen a las de la ley:
          «me echaron» también se busca como «despido».
        </li>
        <li>
          Si ningún artículo coincide lo suficiente, no se consulta al modelo de IA y te avisamos que no encontramos una
          respuesta.
        </li>
        <li>
          Si hay artículos que coinciden, el modelo escribe una respuesta corta usando solo esos artículos. Si cita un
          artículo que no se le pasó, la respuesta se descarta.
        </li>
      </ol>

      <h2>Límites</h2>
      <ul>
        <li>Es información general. Para un caso concreto, consultá con un abogado o con el organismo que corresponda.</li>
        <li>
          Tu convenio colectivo o estatuto puede darte más derechos que la Ley de Contrato de Trabajo. En tránsito, cada
          provincia y municipio puede tener normas propias.
        </li>
        <li>Hay un máximo de preguntas por día. Si se alcanza, se puede volver a preguntar al día siguiente.</li>
      </ul>

      <p>
        <Link href="/">
          <ChevronLeft aria-hidden size={14} /> Volver a preguntar
        </Link>
      </p>
    </section>
  );
}
