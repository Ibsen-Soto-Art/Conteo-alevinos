import { expect, test, type Page } from "@playwright/test";

/**
 * Un conteo de verdad, sin datos de ejemplo: prueba de 100 con la cámara falsa, una bolsa,
 * terminar, y al recargar la página el conteo sigue guardado en el teléfono.
 */

const numero = (texto: string | null) => Number((texto ?? "").replace(/\D/g, ""));
const leer = async (page: Page, selector: string) => numero(await page.locator(selector).textContent());

test("cuenta, guarda la bolsa y el conteo sigue ahí al recargar", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/#/");
  await expect(page.getByText("Todo guardado")).toBeVisible();
  await expect(page.locator(".ultimo-conteo")).toHaveCount(0);

  await page.getByRole("button", { name: "Contar alevinos" }).click();
  await page.getByRole("button", { name: "Tilapia" }).click();
  await page.getByRole("button", { name: "Grande" }).click();
  await page.getByRole("button", { name: /Siguiente/ }).click();

  // Prueba de 100: se espera a que la app cuente cerca de 100 y se da por terminada.
  await expect.poll(() => leer(page, ".prueba-numero"), { timeout: 60_000, intervals: [100] }).toBeGreaterThanOrEqual(96);
  await page.getByRole("button", { name: "Ya pasaron todos" }).click();
  await expect(page.getByText("Prueba buena")).toBeVisible();
  await page.getByRole("button", { name: /Siguiente/ }).click();

  await page.getByRole("button", { name: "500", exact: true }).click();
  await page.getByRole("button", { name: "Empezar a contar" }).click();

  // Los 100 de la prueba no van en la bolsa: primero se devuelven al tanque.
  await expect(page.getByText("Devuelva los 100 de la prueba al tanque")).toBeVisible();
  await page.getByRole("button", { name: "Listo, empezar a contar" }).click();

  // Contando empieza la bolsa 1 en 0, y no se puede cerrar una bolsa vacía.
  await expect(page.getByText("Bolsa 1")).toBeVisible();
  await expect(page.locator(".contador-numero")).toHaveText("0");
  await expect(page.locator(".total-hoy strong")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Cerrar bolsa" })).toBeDisabled();
  await expect.poll(() => leer(page, ".contador-numero"), { timeout: 30_000 }).toBeGreaterThan(30);

  await page.getByRole("button", { name: "Cerrar bolsa" }).click();
  await expect(page.getByText("¡Bolsa 1 lista!")).toBeVisible();
  const guardada = await leer(page, ".bolsa-lista-numero");
  await page.getByRole("button", { name: "Terminar" }).click();

  await expect(page.getByText("Conteo terminado")).toBeVisible();
  expect(await leer(page, ".resumen-total strong")).toBe(guardada);

  // Se recarga la página: lo contado sigue en el teléfono.
  await page.reload();
  await expect(page.locator(".ultimo-conteo")).toBeVisible();
  await expect(page.locator(".ultimo-conteo")).toContainText("Tilapia grande · 1 bolsa");
  expect(await leer(page, ".ultimo-conteo .tarjeta-numero")).toBe(guardada);
  await expect(page.getByText("Todo guardado")).toBeVisible();
});
