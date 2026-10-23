import { expect, test, type Page } from "@playwright/test";

/**
 * Lo contado no se pierde aunque la página se cierre, se vuelva atrás o el teléfono corte la cámara
 * (antes: al recargar se perdía la bolsa abierta y había que repetir la Prueba de 100; atrás desde
 * Contando llevaba a «Empezar a contar» y arrancaba otro conteo en la bolsa 1).
 */

const numero = (t: string | null) => Number((t ?? "").replace(/\D/g, ""));
const leer = async (page: Page, s: string) => numero(await page.locator(s).first().textContent());

async function hastaContando(page: Page) {
  await page.goto("/#/");
  await page.getByRole("button", { name: "Contar alevinos" }).click();
  await page.getByRole("button", { name: "Pangasius" }).click();
  await page.getByRole("button", { name: "Grande" }).click();
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await expect.poll(() => leer(page, ".prueba-numero"), { timeout: 90_000, intervals: [200] }).toBeGreaterThanOrEqual(96);
  await page.getByRole("button", { name: "Ya pasaron todos" }).click();
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByRole("button", { name: "Empezar a contar" }).click();
  await page.getByRole("button", { name: "Listo, empezar a contar" }).click();
  await expect(page.getByText("Bolsa 1")).toBeVisible();
}

test("el conteo abierto sigue después de recargar, de volver atrás y de que se corte la cámara", async ({ page }) => {
  test.setTimeout(300_000);
  await hastaContando(page);
  await expect.poll(() => leer(page, ".contador-numero"), { timeout: 45_000 }).toBeGreaterThan(10);
  await page.getByRole("button", { name: "Cerrar bolsa" }).click();
  const bolsa1 = await leer(page, ".bolsa-lista-numero");
  await page.getByRole("button", { name: "Siguiente bolsa" }).click();
  await expect.poll(() => leer(page, ".contador-numero"), { timeout: 45_000 }).toBeGreaterThan(10);

  // 1. La página se cierra y se abre (como cuando el iPhone la cierra en segundo plano).
  const antes = await leer(page, ".contador-numero");
  await page.reload();
  await expect(page.locator(".camara-bolsa")).toHaveText(/Bolsa 2/);
  expect(await leer(page, ".contador-numero")).toBeGreaterThanOrEqual(antes);
  expect(await leer(page, ".total-hoy strong")).toBeGreaterThanOrEqual(bolsa1 + antes);

  // 2. Atrás desde Contando: al Inicio, que ofrece seguir (no a «Empezar a contar»).
  await page.goBack();
  await expect(page.getByRole("button", { name: /Seguir contando/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Contar alevinos" })).toHaveCount(0);
  await page.getByRole("button", { name: /Seguir contando/ }).click();
  await expect(page.locator(".camara-bolsa")).toHaveText(/Bolsa 2/);

  // 3. El teléfono corta la cámara: se vuelve a abrir sola y sigue contando.
  const pistaViva = () =>
    page.evaluate(() => {
      const pista = ((document.querySelector(".camara video") as HTMLVideoElement | null)?.srcObject as MediaStream | null)?.getVideoTracks()[0];
      return pista?.readyState === "live" ? pista.id : "";
    });
  // Primero, que la cámara haya terminado de abrirse al volver a Contando.
  await expect.poll(pistaViva, { timeout: 15_000 }).not.toBe("");
  const cortada = await page.evaluate(() => {
    const video = document.querySelector(".camara video") as HTMLVideoElement;
    const pista = (video.srcObject as MediaStream).getVideoTracks()[0]!;
    pista.stop();
    pista.dispatchEvent(new Event("ended"));
    return pista.id;
  });
  await expect.poll(async () => { const id = await pistaViva(); return id !== "" && id !== cortada; }, { timeout: 15_000 }).toBe(true);
  const tras = await leer(page, ".contador-numero");
  await expect.poll(() => leer(page, ".contador-numero"), { timeout: 45_000 }).toBeGreaterThan(tras);

  // 4. Terminar desde el Inicio: cierra la bolsa abierta y queda en el historial.
  await page.goBack();
  await page.getByRole("button", { name: "Terminar", exact: true }).click();
  await page.getByRole("button", { name: "Sí, terminar" }).click();
  await expect(page.getByText("Conteo terminado")).toBeVisible();
  await expect(page.locator(".resumen-total")).toContainText("2 bolsas");
  await page.getByRole("button", { name: /volver al inicio/ }).click();
  await expect(page.getByRole("button", { name: "Contar alevinos" })).toBeVisible();
});
