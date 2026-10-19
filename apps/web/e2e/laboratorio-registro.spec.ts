import { expect, test } from "@playwright/test";
import { PECES_CANAL, VIDEO_CANAL } from "./video";

/**
 * /laboratorio: un video grabado se procesa cuadro por cuadro (sin saltarse ninguno) y siempre da
 * lo mismo; el registro dice qué pista cambió el contador y cuánto.
 */
test("laboratorio: cuadro por cuadro es repetible y el registro dice quién sumó", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1100, height: 1400 });
  await page.goto("/laboratorio");
  await page.locator(".selector-perfil").selectOption({ label: "Cachama pequeño" });
  await page.locator('input[type="file"]').setInputFiles(VIDEO_CANAL);

  const vueltas: string[][] = [];
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    await page.getByRole("button", { name: "Procesar cuadro por cuadro" }).click();
    await expect(page.getByRole("button", { name: /^Parar/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Procesar cuadro por cuadro" })).toBeVisible({ timeout: 200_000 });
    await expect(page.locator(".conteo-numero")).toHaveText(String(PECES_CANAL));
    vueltas.push(await page.locator(".registro tbody tr").allTextContents());
  }
  // Un evento +1 por alevino, y las dos vueltas idénticas (mismos ID, horas y medidas).
  expect(vueltas[0]).toHaveLength(PECES_CANAL);
  expect(vueltas[0]!.every((f) => f.includes("+1"))).toBe(true);
  expect(vueltas[1]).toEqual(vueltas[0]);
  await expect(page.locator(".registro-cabecera")).toContainText(`${PECES_CANAL} eventos · total ${PECES_CANAL}`);
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toBeEnabled();
});
