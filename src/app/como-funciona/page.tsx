import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLawSummaries } from "@/lib/laws-summary";
import { vigenciaText } from "@/lib/format";

export const metadata: Metadata = { title: "Cómo funciona" };

export default function HowItWorks() {
  const laws = getLawSummaries();
  return (
    <section className="prose">
      <h1>Cómo funciona</h1>
      <p className="lead">
        Escribís tu situación como se la contarías a alguien. El sistema busca en el texto oficial de tres leyes,
        encuentra los artículos que aplican y te explica qué dicen, citándolos.
      </p>

      <h2>Qué leyes usa</h2>
      <ul>
        {laws.map((l) => (
          <li key={l.id}>
            <strong>
              {l.name} ({l.number})
            </strong>{" "}
            — {vigenciaText(l)}.{" "}
            <a href={l.pageUrl} target="_blank" rel="noopener noreferrer">
              InfoLEG <ExternalLink aria-hidden size={14} />
            </a>
          </li>
        ))}
      </ul>
      <p>
        Se usa el <em>texto actualizado</em> de InfoLEG, que incorpora las modificaciones posteriores (no el texto
        original de cada ley). Cada artículo citado muestra su texto oficial y las notas de modificación.
      </p>

      <h2>Qué pasa con cada pregunta</h2>
      <ol>
        <li>
          Si trata de un tema legal que no cubrimos (alquileres, familia, jubilaciones, impuestos…), te lo decimos y
          te orientamos sobre dónde se regula y a quién consultar.
        </li>
        <li>
          Si no, se busca en las tres leyes a la vez. Primero se traduce el lenguaje común a términos legales
          («me echaron» → despido).
        </li>
        <li>
          <strong>Si no aparece ningún artículo relevante, no se le pregunta al modelo de IA.</strong> Preferimos
          decir «no encontré» antes que arriesgar una respuesta inventada.
        </li>
        <li>
          Si hay artículos relevantes, el modelo redacta una respuesta corta usando <em>solo</em> esos artículos. Se
          verifica que cite artículos que realmente se le dieron; si no, la respuesta se descarta.
        </li>
      </ol>

      <h2>Límites</h2>
      <ul>
        <li>Es información general, no asesoramiento legal. Tu caso puede tener particularidades.</li>
        <li>
          En trabajo, tu convenio colectivo o estatuto puede darte más derechos que la ley. En tránsito, cada
          provincia y municipio puede tener normas propias.
        </li>
        <li>Es una demo con un cupo diario de consultas: si se agota, vuelve a estar disponible al día siguiente.</li>
      </ul>

      <p>
        <Link href="/">← Hacer una pregunta</Link>
      </p>
    </section>
  );
}
