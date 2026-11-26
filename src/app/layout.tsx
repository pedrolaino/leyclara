import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SITE_DISCLAIMER, SITE_NAME, SITE_TAGLINE } from "@/config/site";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-serif/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The CSP nonce changes on every request, so pages can't be prerendered.
  await connection();
  return (
    <html lang="es-AR">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              {SITE_NAME}
            </Link>
            <nav aria-label="Principal">
              <Link href="/explorar">Leyes</Link>
              <Link href="/como-funciona">Cómo funciona</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>{SITE_DISCLAIMER}</p>
            <p className="footer-sources">
              Fuente: textos actualizados de{" "}
              <a href="https://servicios.infoleg.gob.ar/" target="_blank" rel="noopener noreferrer">
                InfoLEG
              </a>{" "}
              (Ministerio de Justicia de la Nación).
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
