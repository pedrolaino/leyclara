import { expect, type Page, test } from "@playwright/test";

const ask = async (page: Page, question: string) => {
  await page.getByLabel("Contá qué te pasó").fill(question);
  await page.getByRole("button", { name: "Consultar" }).click();
};

const noHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};

test("home shows the example answer and the frequent questions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/¿Qué dice la ley sobre tu caso\?/);
  const example = page.getByRole("article", { name: "Ejemplo de respuesta" });
  await expect(example.getByText("Artículo 150")).toBeVisible();
  await expect(example.locator("mark")).toHaveText("catorce (14) días corridos");
  for (const area of ["Trabajo", "Compras", "Tránsito"]) {
    await expect(page.getByRole("heading", { name: area, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Ley 24.449" })).toHaveAttribute("href", "/explorar/lnt");
  await expect(page.getByText("No reemplaza el consejo de un abogado")).toBeVisible();
  await noHorizontalScroll(page);
});

test("a frequent question fills in the form, and asking it gives the official article", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) cspErrors.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "¿Cuántos días de vacaciones me corresponden?" }).click();
  await expect(page.getByLabel("Contá qué te pasó")).toHaveValue("¿Cuántos días de vacaciones me corresponden?");
  await page.getByRole("button", { name: "Consultar" }).click();

  const answer = page.getByRole("article", { name: "Respuesta", exact: true });
  await expect(answer).toBeVisible();
  await expect(answer.getByText("Artículo 150", { exact: true })).toBeVisible();
  await expect(answer.getByText("catorce (14) días corridos").first()).toBeVisible();
  await expect(answer.getByText(/Texto vigente según InfoLEG al/)).toBeVisible();
  await expect(answer.getByText(/abogado laboralista/)).toBeVisible();
  await expect(page.getByRole("article", { name: "Ejemplo de respuesta" })).toHaveCount(0);
  await noHorizontalScroll(page);

  // Follow-up questions are asked right away and show on top.
  await answer.getByRole("button", { name: "¿Qué me tienen que pagar si me despiden?" }).click();
  await expect(page.getByRole("article", { name: "Respuesta", exact: true })).toHaveCount(2);
  await expect(page.getByRole("article", { name: "Respuesta", exact: true }).first().getByRole("heading", { level: 2 })).toHaveText(
    "¿Qué me tienen que pagar si me despiden?",
  );
  expect(cspErrors).toEqual([]);
});

test("the placeholder types example cases, unless motion is reduced", async ({ page }) => {
  await page.goto("/");
  const box = page.getByLabel("Contá qué te pasó");
  await expect(box).toHaveAttribute("placeholder", "Ej.: compré por internet y me arrepentí.");
  // It deletes the first case and types the next one.
  await expect.poll(() => box.getAttribute("placeholder"), { timeout: 8000 }).toMatch(/^Ej\.: (?!compré)/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForTimeout(3500);
  await expect(box).toHaveAttribute("placeholder", "Ej.: compré por internet y me arrepentí.");
});

test("earlier questions stay below, under their own heading", async ({ page }) => {
  await page.goto("/");
  await ask(page, "¿Cuántos días de vacaciones me corresponden?");
  await expect(page.getByRole("article", { name: "Respuesta", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Consultas anteriores" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Volver al inicio" })).toHaveCount(0);

  await ask(page, "¿Cuál es la velocidad máxima en autopista?");
  await expect(page.getByRole("article", { name: "Respuesta", exact: true })).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Consultas anteriores" })).toBeVisible();
});

test("the logo goes back to the start of the home page", async ({ page }) => {
  await page.goto("/");
  await ask(page, "¿Cuál es la velocidad máxima en una autopista?");
  await expect(page.getByRole("article", { name: "Respuesta", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ley Clara" }).click();
  await expect(page.getByRole("article", { name: "Ejemplo de respuesta" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Respuesta", exact: true })).toHaveCount(0);
});

test("the theme button switches to light mode and remembers it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = "rgb(244, 244, 242)";
  expect(await bg()).not.toBe(light);
  await page.getByRole("button", { name: "Activar tema claro" }).click();
  expect(await bg()).toBe(light);
  await page.reload();
  expect(await bg()).toBe(light);
  await expect(page.getByRole("button", { name: "Activar tema oscuro" })).toBeVisible();
});

test("the header shows the logo and the site has its icons", async ({ page, request }) => {
  await page.goto("/");
  const logo = page.getByRole("link", { name: "Ley Clara" }).locator("img:visible");
  await expect(logo).toHaveCount(1);
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('link[rel="icon"]').first()).toBeAttached();
  await expect(page.locator('link[rel="apple-touch-icon"]')).toBeAttached();
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("Ley Clara");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});

test("shared links get a preview with title, description and image", async ({ page, request }) => {
  await page.goto("/");
  const meta = (key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute("content");
  expect(await meta("og:title")).toBe("Ley Clara");
  expect(await meta("og:description")).toBeTruthy();
  expect(await meta("twitter:card")).toBe("summary_large_image");
  const image = await meta("og:image");
  expect(image).toMatch(/^https?:\/\//);

  const res = await request.get(new URL(image!).pathname);
  expect(res.headers()["content-type"]).toBe("image/png");
  const png = await res.body();
  // Width and height are in the PNG header. WhatsApp skips images over 600 KB.
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(png.length).toBeLessThan(300_000);
});

test("off topic questions are declined", async ({ page }) => {
  await page.goto("/");
  await ask(page, "¿Quién ganó el último mundial de fútbol?");
  await expect(page.getByText("Esa pregunta no es sobre trabajo, compras ni tránsito")).toBeVisible();
  await expect(page.getByRole("article", { name: "Respuesta", exact: true })).toHaveCount(0);
});

test("answers are readable in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await ask(page, "¿Quién ganó el último mundial de fútbol?");
  const suggestion = page.locator(".answer-sheet .question-link").first();
  await expect(suggestion).toBeVisible();
  const sheet = await page.locator(".answer-sheet").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const text = await suggestion.evaluate((el) => getComputedStyle(el).color);
  expect(sheet).not.toBe("rgb(255, 255, 255)");
  expect(text).not.toBe("rgb(26, 26, 26)");
});

test("uncovered legal topics say where they are regulated", async ({ page }) => {
  await page.goto("/");
  await ask(page, "¿Cuánto me pueden aumentar el alquiler?");
  await expect(page.getByText("Las consultas sobre alquileres no están cubiertas")).toBeVisible();
  await expect(page.getByText(/Código Civil y Comercial/)).toBeVisible();
});

test("too short questions get a validation message", async ({ page }) => {
  await page.goto("/");
  await ask(page, "hola");
  await expect(page.getByText("Contame un poco más para poder buscar en las leyes.")).toBeVisible();
});

test("the law browser finds articles by word", async ({ page }) => {
  await page.goto("/explorar");
  await page.getByRole("link", { name: /Ley Nacional de Tránsito/ }).click();
  await page.getByLabel("Buscar en esta ley").fill("velocidad");
  await expect(page.getByText("Art. 51", { exact: true })).toBeVisible();
  await noHorizontalScroll(page);
});
