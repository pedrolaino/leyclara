import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { HomeLink } from "@/components/HomeLink";
import { THEME_SCRIPT, ThemeToggle } from "@/components/ThemeToggle";
import { SITE_DISCLAIMER, SITE_NAME, SITE_TAGLINE } from "@/config/site";
import { getEnv } from "@/lib/env";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-serif/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getEnv().siteUrl),
  title: { default: `${SITE_NAME} | Consultas sobre leyes argentinas`, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
  openGraph: { title: SITE_NAME, description: SITE_TAGLINE, siteName: SITE_NAME, locale: "es_AR", type: "website", url: "/" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_TAGLINE },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#161615" },
  ],
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
          <div className="wrap header-layout">
            <a className="skip-link" href="#contenido">
              Saltar al contenido
            </a>
            <HomeLink>
              {/* The theme decides which one shows */}
              <Image className="logo-light" src="/brand/ley-clara-claro.svg" alt="" width={150} height={30} priority />
              <Image className="logo-dark" src="/brand/ley-clara-oscuro.svg" alt="" width={150} height={30} priority />
            </HomeLink>
            <nav aria-label="Navegación principal" className="site-nav">
              <Link href="/#preguntas">Preguntas frecuentes</Link>
              <Link href="/como-funciona" className="how-link">
                Cómo funciona
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="contenido" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="wrap footer-layout">
            <div>
              <p>{SITE_DISCLAIMER}</p>
              <p>
                Textos actualizados de{" "}
                <a href="https://servicios.infoleg.gob.ar/" target="_blank" rel="noopener noreferrer">
                  InfoLEG
                </a>
                , del Ministerio de Justicia de la Nación.
              </p>
            </div>
            <nav aria-label="Más páginas" className="footer-nav">
              <Link href="/explorar">Las leyes</Link>
              <Link href="/como-funciona">Cómo funciona</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
