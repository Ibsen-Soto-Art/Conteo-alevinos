import { expect, test, type Page } from "@playwright/test";

/**
 * Botón de la linterna. La cámara falsa de Chromium no tiene linterna: aquí se le hace creer al
 * navegador que sí («torch» en las capacidades) y se anota cada vez que la app la prende o apaga.
 */
async function conLinterna(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __linterna: boolean[] };
    w.__linterna = [];
    const capacidades = MediaStreamTrack.prototype.getCapabilities;
    MediaStreamTrack.prototype.getCapabilities = function () {
      return { ...(capacidades?.call(this) ?? {}), torch: true } as MediaTrackCapabilities;
    };
    const aplicar = MediaStreamTrack.prototype.applyConstraints;
    MediaStreamTrack.prototype.applyConstraints = function (c?: MediaTrackConstraints) {
      const torch = (c?.advanced?.[0] as { torch?: boolean } | undefined)?.torch;
      if (torch !== undefined) {
        w.__linterna.push(torch);
        return Promise.resolve();
      }
      return aplicar.call(this, c);
    };
  });
}

const veces = (page: Page) => page.evaluate(() => (window as unknown as { __linterna: boolean[] }).__linterna);
const boton = (page: Page) => page.getByRole("button", { name: "Linterna" });

test("Contando: la linterna se prende al abrir la cámara, se apaga con el botón y se recuerda", async ({ page }) => {
  await conLinterna(page);
  await page.goto("/?demo#/contando");
  await expect(boton(page)).toHaveAttribute("aria-pressed", "true");
  expect(await veces(page)).toEqual([true]);

  // El botón se ve entero, mide al menos 56 px y no tapa el contador.
  const b = (await boton(page).boundingBox())!;
  const banda = (await page.locator(".camara-banda").boundingBox())!;
  const ancho = page.viewportSize()!.width;
  expect(b.height).toBeGreaterThanOrEqual(56);
  expect(b.x + b.width).toBeLessThanOrEqual(ancho);
  expect(b.y + b.height).toBeLessThanOrEqual(banda.y);

  await boton(page).click();
  await expect(boton(page)).toHaveAttribute("aria-pressed", "false");
  expect(await veces(page)).toEqual([true, false]);

  // La próxima vez empieza apagada (no se prende sola).
  await page.reload();
  await expect(boton(page)).toHaveAttribute("aria-pressed", "false");
  expect(await veces(page)).toEqual([]);
  await boton(page).click();
  await expect(boton(page)).toHaveAttribute("aria-pressed", "true");
  expect(await veces(page)).toEqual([true]);
});

test("Prueba de 100: también tiene el botón de la linterna", async ({ page }) => {
  await conLinterna(page);
  await page.goto("/?demo#/prueba");
  await page.getByRole("button", { name: "Repetir" }).click();
  await expect(boton(page)).toBeVisible();
  const b = (await boton(page).boundingBox())!;
  expect(b.height).toBeGreaterThanOrEqual(56);
});

test("si el celular no deja manejar la linterna, el botón no aparece", async ({ page }) => {
  await page.goto("/?demo#/contando");
  await expect(page.locator(".camara video")).toBeVisible();
  await expect(page.locator(".camara-bolsa")).toBeVisible();
  await expect(boton(page)).toHaveCount(0);
});
