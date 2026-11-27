import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { HomeLink } from "@/components/HomeLink";
import { THEME_SCRIPT, ThemeToggle } from "@/components/ThemeToggle";
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // The theme script sets data-theme before React loads.
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <HomeLink>
              {/* One of these shows, depending on the theme and the screen width */}
              <Image className="logo logo-full logo-light" src="/brand/ley-clara-claro.svg" alt={SITE_NAME} width={139} height={28} priority />
              <Image className="logo logo-full logo-dark" src="/brand/ley-clara-oscuro.svg" alt={SITE_NAME} width={139} height={28} priority />
              <Image className="logo logo-symbol logo-light" src="/brand/ley-clara-simbolo-claro.svg" alt={SITE_NAME} width={36} height={36} priority />
              <Image className="logo logo-symbol logo-dark" src="/brand/ley-clara-simbolo-oscuro.svg" alt={SITE_NAME} width={36} height={36} priority />
            </HomeLink>
            <nav aria-label="Principal">
              <Link href="/explorar">Leyes</Link>
              <Link href="/como-funciona">Cómo funciona</Link>
              <ThemeToggle />
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
