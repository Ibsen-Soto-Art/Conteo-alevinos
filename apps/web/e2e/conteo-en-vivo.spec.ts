import { expect, test, type Page } from "@playwright/test";
import { PECES_POR_VUELTA, VIDEO_PECES } from "./video";

/**
 * La cámara falsa de Chromium muestra el video sintético de e2e/preparar.ts: manchas oscuras
 * que cruzan la línea de conteo. Comprueba que la app cuenta de verdad lo que pasa por la cámara.
 */

const numero = (texto: string | null) => Number((texto ?? "").replace(/\D/g, ""));
const enBolsa = async (page: Page) => numero(await page.locator(".contador-numero").textContent());

test("Contando: suma los alevinos que cruzan la línea", async ({ page }) => {
  await page.goto("/?demo#/contando");
  const inicio = await enBolsa(page);
  await expect(page.getByText("Luz bien")).toBeVisible({ timeout: 15_000 });
  // El video se repite: en una vuelta completa cruzan todos los peces.
  await expect.poll(() => enBolsa(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(inicio + PECES_POR_VUELTA);
});

test("Contando: en pausa no suma", async ({ page }) => {
  await page.goto("/?demo#/contando");
  await expect(page.getByText("Luz bien")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Pausar" }).click();
  const antes = await enBolsa(page);
  await page.waitForTimeout(VIDEO_PECES.segundos * 1000);
  expect(await enBolsa(page)).toBe(antes);
});

test("Prueba de 100: el número en vivo sube y habilita «Ya pasaron todos»", async ({ page }) => {
  await page.goto("/?demo#/prueba");
  await page.getByRole("button", { name: "Repetir" }).click();
  const boton = page.getByRole("button", { name: "Ya pasaron todos" });
  await expect(boton).toBeDisabled();
  await expect(boton).toBeEnabled({ timeout: 30_000 });
  expect(numero(await page.locator(".circulo-numero").textContent())).toBeGreaterThan(0);
});
