import { expect, test, type Page } from "@playwright/test";

/**
 * Prueba de 100: la cámara se ve grande (entre el 40 % y el 50 % del alto, de lado a lado) y el
 * número es lo más visible después de ella: ~72 px en 360×640 y ~110 px en pantallas de 844 o más.
 * Contando: la cámara ocupa casi toda la pantalla y el número va encima de la imagen.
 */

async function medidas(page: Page) {
  await expect(page.locator(".camara video")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const camara = document.querySelector(".camara")!.getBoundingClientRect();
    const numero = document.querySelector(".contador-numero")!;
    return {
      alto: innerHeight,
      ancho: document.documentElement.clientWidth,
      camara: { alto: camara.height, ancho: camara.width, izquierda: camara.left },
      letra: parseFloat(getComputedStyle(numero).fontSize),
    };
  });
}

function revisar(m: Awaited<ReturnType<typeof medidas>>) {
  expect(m.camara.alto / m.alto, "la cámara ocupa entre el 40 % y el 50 % del alto").toBeGreaterThanOrEqual(0.4 - 0.005);
  expect(m.camara.alto / m.alto).toBeLessThanOrEqual(0.5 + 0.005);
  expect(m.camara.ancho, "la cámara va de lado a lado").toBeCloseTo(m.ancho, 0);
  expect(m.camara.izquierda).toBeCloseTo(0, 0);
  if (m.alto <= 640) expect(m.letra).toBeGreaterThanOrEqual(64);
  else expect(m.letra).toBeGreaterThanOrEqual(100);
  expect(m.letra).toBeLessThanOrEqual(120);
}

test("Contando: la cámara ocupa casi toda la pantalla y el número va encima", async ({ page }) => {
  await page.goto("/?demo#/contando");
  const m = await medidas(page);
  expect(m.camara.alto / m.alto, "la cámara ocupa al menos el 65 % del alto").toBeGreaterThanOrEqual(0.65);
  expect(m.camara.ancho, "la cámara va de lado a lado").toBeCloseTo(m.ancho, 0);
  expect(m.letra).toBeGreaterThanOrEqual(m.alto <= 640 ? 56 : 90);
  // Los avisos y el contador van encima de la imagen, no gastan espacio aparte.
  const camara = (await page.locator(".camara").boundingBox())!;
  const bolsa = (await page.locator(".camara-bolsa").boundingBox())!;
  const banda = (await page.locator(".camara-banda").boundingBox())!;
  expect(bolsa.y + bolsa.height).toBeLessThanOrEqual(camara.y + camara.height);
  expect(banda.y + banda.height).toBeLessThanOrEqual(camara.y + camara.height);
  // Sobre el contador queda al menos el 40 % de la cámara para ver el canal.
  expect((banda.y - camara.y) / camara.height).toBeGreaterThanOrEqual(0.4);
});

test("Prueba de 100: cámara grande y número grande", async ({ page }) => {
  await page.goto("/?demo#/prueba");
  await page.getByRole("button", { name: "Repetir" }).click();
  revisar(await medidas(page));
});
