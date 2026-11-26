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
        {SITE_NAME} busca la respuesta en el texto de tres leyes: la Ley de Contrato de Trabajo, la Ley de Defensa del
        Consumidor y la Ley Nacional de Tránsito. Usa la versión actualizada que publica InfoLEG, con todas las reformas
        incorporadas.
      </p>

      <h2>Un ejemplo</h2>
      <p>
        Si escribís «me echaron después de cuatro años, ¿qué me tienen que pagar?», la búsqueda también prueba con las
        palabras que usa la ley, como «despido» e «indemnización», y encuentra el artículo 245 de la Ley de Contrato de
        Trabajo. El modelo de IA recibe ese artículo y algunos más que podrían aplicar, y escribe la respuesta usando solo
        esos textos. Debajo de la respuesta aparece el artículo completo, tal como está en la ley.
      </p>

      <h2>Cuándo no responde</h2>
      <p>
        Si ningún artículo coincide con tu pregunta, no se consulta al modelo y te avisamos que no encontramos respuesta.
        Las preguntas sobre temas de otras leyes, como alquileres, divorcios o jubilaciones, reciben una orientación sobre
        dónde se regula el tema y a quién consultar. También se descarta cualquier respuesta del modelo que cite un
        artículo que no estaba entre los que recibió.
      </p>

      <h2>Límites</h2>
      <p>
        Es información general. Tu convenio colectivo puede darte más derechos que la ley, y cada provincia o municipio
        puede tener sus propias normas de tránsito. Para un caso concreto, consultá con un abogado o con el organismo que
        corresponda. Como es una demo con un cupo diario de consultas, a veces se agota; al día siguiente vuelve a
        funcionar.
      </p>

      <h2>Textos usados</h2>
      <ul>
        {laws.map((l) => (
          <li key={l.id}>
            {l.name} ({l.number}). {vigenciaText(l)}.{" "}
            <a href={l.pageUrl} target="_blank" rel="noopener noreferrer">
              Ver en InfoLEG <ExternalLink aria-hidden size={14} />
            </a>
          </li>
        ))}
      </ul>

      <p>
        <Link href="/">
          <ChevronLeft aria-hidden size={14} /> Volver a preguntar
        </Link>
      </p>
    </section>
  );
}
