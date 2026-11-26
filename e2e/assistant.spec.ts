import { expect, type Page, test } from "@playwright/test";

const ask = async (page: Page, question: string) => {
  await page.getByLabel("Tu pregunta").fill(question);
  await page.getByRole("button", { name: "Preguntar" }).click();
};

const noHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
};

test("home shows the three areas with example questions", async ({ page }) => {
  await page.goto("/");
  for (const area of ["Trabajo", "Compras", "Tránsito"]) {
    await expect(page.getByRole("heading", { name: area })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "¿Cuántos días de vacaciones me corresponden?" })).toBeVisible();
  await expect(page.getByText("publicado en InfoLEG")).toBeVisible();
  await expect(page.getByText("No reemplaza el consejo de un abogado")).toBeVisible();
  await noHorizontalScroll(page);
});

test("an example question gets an answer with the official article", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "¿Cuántos días de vacaciones me corresponden?" }).click();

  const answer = page.getByRole("article", { name: "Respuesta" });
  await expect(answer).toBeVisible();
  await expect(answer.getByText("Art. 150", { exact: true })).toBeVisible();
  await expect(answer.getByText("catorce (14) días corridos").first()).toBeVisible();
  await expect(answer.getByText(/Texto vigente según InfoLEG al/)).toBeVisible();
  await expect(answer.getByText(/abogado laboralista/)).toBeVisible();
  await noHorizontalScroll(page);

  // Follow-up questions start a new turn.
  await answer.getByRole("button", { name: "¿Cuánto dura el período de prueba?" }).click();
  await expect(page.getByRole("article", { name: "Respuesta" })).toHaveCount(2);
});

test("off topic questions are declined", async ({ page }) => {
  await page.goto("/");
  await ask(page, "¿Quién ganó el último mundial de fútbol?");
  await expect(page.getByText("Esa pregunta no es sobre trabajo, compras ni tránsito")).toBeVisible();
  await expect(page.getByRole("article", { name: "Respuesta" })).toHaveCount(0);
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
