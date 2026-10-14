import { expect, test, type Page } from "@playwright/test";

/** «Volver a cero» pide confirmación y solo borra lo que tiene que borrar. */

const numero = (texto: string | null) => Number((texto ?? "").replace(/\D/g, ""));
const leer = async (page: Page, selector: string) => numero(await page.locator(selector).textContent());

test("Contando: «No» no cambia nada y «Sí» pone en 0 solo la bolsa abierta", async ({ page }) => {
  await page.goto("/?demo#/contando");
  // En pausa la cámara no suma, así el número queda quieto para comparar.
  await page.getByRole("button", { name: "Pausar" }).click();
  const enBolsa = await leer(page, ".contador-numero");
  const totalHoy = await leer(page, ".total-hoy strong");
  expect(enBolsa).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Volver a cero" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("¿Volver a cero?");
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(await leer(page, ".contador-numero")).toBe(enBolsa);

  await page.getByRole("button", { name: "Volver a cero" }).click();
  await page.getByRole("button", { name: "Sí, volver a cero" }).click();
  await expect(page.locator(".contador-numero")).toHaveText("0");
  // Las bolsas cerradas siguen: el total de hoy solo pierde lo de la bolsa abierta.
  expect(await leer(page, ".total-hoy strong")).toBe(totalHoy - enBolsa);
  await expect(page.getByText("Bolsa 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a cero" })).toBeDisabled();
});

test("Prueba de 100: vuelve a 0 sin salir de la pantalla ni perder el pez", async ({ page }) => {
  await page.goto("/?demo#/prueba");
  await page.getByRole("button", { name: "Repetir" }).click();

  await page.evaluate(() =>
    (window as unknown as { __demo: { despachar: (a: unknown) => void } }).__demo.despachar({ tipo: "sumarPrueba", cantidad: 500 }),
  );
  await expect.poll(() => leer(page, ".circulo-numero")).toBeGreaterThanOrEqual(500);
  await page.getByRole("button", { name: "Volver a cero" }).click();
  await page.getByRole("button", { name: "Sí, volver a cero" }).click();

  // La cámara falsa sigue contando, pero ya no está cerca de 500.
  expect(await leer(page, ".circulo-numero")).toBeLessThan(50);
  expect(new URL(page.url()).hash).toBe("#/prueba");
  await expect(page.getByText("Paso 2 de 3")).toBeVisible();
});

test("Prueba de 100: con el conteo en 0 el botón se ve apagado", async ({ page }) => {
  await page.goto("/?demo#/prueba");
  await page.getByRole("button", { name: "Repetir" }).click();
  await expect(page.locator(".circulo-numero")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Volver a cero" })).toBeDisabled();
});
