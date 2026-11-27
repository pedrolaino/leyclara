import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/config/site";

// The preview WhatsApp, Instagram and others show when the link is shared.
export const alt = `${SITE_NAME}: consultá qué dice la ley sobre tu caso`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1a1a1a";
const MUTED = "#55555c";
const MARK = "#ffe066";

// Only read while building (the image is static), so the server bundle doesn't need these files.
const file = (...parts: string[]) => readFile(path.join(/* turbopackIgnore: true */ process.cwd(), ...parts));

export default async function Image() {
  const fonts = "node_modules/@fontsource/ibm-plex-sans/files";
  const [regular, semibold, logo] = await Promise.all([
    file(fonts, "ibm-plex-sans-latin-400-normal.woff"),
    file(fonts, "ibm-plex-sans-latin-600-normal.woff"),
    file("public/brand/ley-clara-claro.svg"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px 72px",
          background: "#ffffff",
          color: INK,
          fontFamily: "IBM Plex Sans",
        }}
      >
        <img src={`data:image/svg+xml;base64,${logo.toString("base64")}`} width={327} height={66} alt="" />

        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 600, lineHeight: 1.15, letterSpacing: -1.5 }}>
          <div style={{ display: "flex" }}>
            Consultá qué dice&nbsp;
            <span style={{ background: `linear-gradient(transparent 55%, ${MARK} 55%)`, padding: "0 6px" }}>la ley</span>
          </div>
          <div>sobre tu caso</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 32, color: MUTED }}>Con el artículo exacto y su texto oficial.</div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Trabajo", "Compras", "Tránsito"].map((area) => (
              <div key={area} style={{ fontSize: 28, padding: "8px 22px", border: "2px solid #dcdcd8", borderRadius: 8 }}>
                {area}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "IBM Plex Sans", data: regular, weight: 400, style: "normal" },
        { name: "IBM Plex Sans", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
