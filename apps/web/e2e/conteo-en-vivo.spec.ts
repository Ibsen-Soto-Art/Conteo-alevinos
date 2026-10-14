import { expect, test } from "@playwright/test";
import { VIDEO_PECES } from "./video";

/**
 * La cámara falsa de Chromium muestra el video sintético de e2e/preparar.ts: manchas oscuras
 * que cruzan la línea de conteo. Comprueba que la app cuenta de verdad lo que pasa por la cámara.
 */

const numero = (texto: string | null) => Number((texto ?? "").replace(/\D/g, ""));

test("Contando: suma los alevinos que cruzan la línea", async ({ page }) => {
  await page.goto("/#/contando");
  await expect(page.getByText("Luz bien")).toBeVisible({ timeout: 15_000 });
  // El video se repite: en una vuelta completa cruzan todos los peces.
  await expect
    .poll(async () => numero(await page.locator(".contador-numero").textContent()), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(VIDEO_PECES.peces);
  await expect(page.getByText("Bolsa 1")).toBeVisible();
});

test("Contando: en pausa no suma", async ({ page }) => {
  await page.goto("/#/contando");
  await expect(page.getByText("Luz bien")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Pausar" }).click();
  const antes = numero(await page.locator(".contador-numero").textContent());
  await page.waitForTimeout(VIDEO_PECES.segundos * 1000);
  expect(numero(await page.locator(".contador-numero").textContent())).toBe(antes);
});

test("Prueba de 100: el número en vivo sube y habilita «Ya pasaron todos»", async ({ page }) => {
  await page.goto("/#/prueba");
  const boton = page.getByRole("button", { name: "Ya pasaron todos" });
  await expect(boton).toBeDisabled();
  await expect(boton).toBeEnabled({ timeout: 30_000 });
  expect(numero(await page.locator(".circulo-numero").textContent())).toBeGreaterThan(0);
});
