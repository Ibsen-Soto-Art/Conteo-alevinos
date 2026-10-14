import { expect, test, type Page } from "@playwright/test";

/**
 * Regla 4 de docs/diseno.md: en el celular ninguna pantalla tiene scroll.
 * Se revisa cada pantalla (y sus estados principales) en los tamaños de playwright.config.ts.
 */

interface Medida {
  scrollDocumento: number;
  alto: number;
  /** Elementos visibles que se salen por abajo o por la derecha de la pantalla. */
  fuera: string[];
  /** Zonas que esconden contenido porque no les cabe (overflow hidden recortando). */
  recortadas: string[];
  /** Botones con el texto cortado. */
  textoCortado: string[];
  /** Cosas tocables de menos de 56 px de alto, y botones principales de menos de 72 px. */
  pequenos: string[];
}

async function medir(pagina: Page): Promise<Medida> {
  return pagina.evaluate(() => {
    const nombre = (el: Element) =>
      `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} «${(el.textContent ?? "").trim().slice(0, 30)}»`;
    const visibles = [...document.querySelectorAll(".app *")].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== "hidden";
    });
    const ancho = document.documentElement.clientWidth;
    const alto = window.innerHeight;
    return {
      scrollDocumento: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      alto,
      fuera: visibles
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.bottom > alto + 0.5 || b.right > ancho + 0.5 || b.top < -0.5 || b.left < -0.5;
        })
        .map((el) => {
          const b = el.getBoundingClientRect();
          return `${nombre(el)} abajo=${b.bottom.toFixed(0)}/${alto} derecha=${b.right.toFixed(0)}/${ancho}`;
        }),
      recortadas: [...document.querySelectorAll(".app, .pantalla, .pantalla-centro, .pantalla-pie, .pantalla-cabecera")]
        .filter((el) => el.scrollHeight > el.clientHeight + 1)
        .map(nombre),
      textoCortado: [...document.querySelectorAll(".app button, .app .estado")]
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map(nombre),
      pequenos: [...document.querySelectorAll(".app button")]
        .filter((el) => {
          const minimo = el.classList.contains("boton-principal") ? 72 : 56;
          return el.getBoundingClientRect().height < minimo - 0.5;
        })
        .map(nombre),
    };
  });
}

async function revisar(pagina: Page) {
  // La letra se carga aparte: medir con la letra final.
  await pagina.evaluate(() => document.fonts.ready);
  const m = await medir(pagina);
  expect(m.scrollDocumento, "la página tiene scroll vertical").toBeLessThanOrEqual(m.alto);
  expect(m.fuera, "hay cosas fuera de la pantalla").toEqual([]);
  expect(m.recortadas, "hay contenido recortado que no cabe").toEqual([]);
  expect(m.textoCortado, "hay botones con el texto cortado").toEqual([]);
  expect(m.pequenos, "hay botones más pequeños de lo permitido").toEqual([]);
}

const PANTALLAS: { nombre: string; ruta: string; antes?: (p: Page) => Promise<void> }[] = [
  { nombre: "inicio", ruta: "" },
  { nombre: "qué pez", ruta: "pez" },
  { nombre: "prueba de 100: resultado", ruta: "prueba" },
  {
    nombre: "prueba de 100: contando",
    ruta: "prueba",
    antes: (p) => p.getByRole("button", { name: "Repetir" }).click(),
  },
  { nombre: "cuántos por bolsa", ruta: "meta" },
  {
    nombre: "cuántos por bolsa: sin meta",
    ruta: "meta",
    antes: (p) => p.getByRole("button", { name: /Sin meta/ }).click(),
  },
  { nombre: "contando", ruta: "contando" },
  {
    nombre: "contando: en pausa",
    ruta: "contando",
    antes: (p) => p.getByRole("button", { name: "Pausar" }).click(),
  },
  { nombre: "bolsa lista", ruta: "bolsa-lista" },
  { nombre: "resumen", ruta: "resumen" },
  {
    nombre: "resumen: segunda página",
    ruta: "resumen",
    antes: (p) => p.getByRole("button", { name: /Después/ }).click(),
  },
  { nombre: "conteos", ruta: "conteos" },
  { nombre: "ayuda", ruta: "ayuda" },
];

for (const pantalla of PANTALLAS) {
  test(`sin scroll: ${pantalla.nombre}`, async ({ page }) => {
    await page.goto(`/?demo#/${pantalla.ruta}`);
    await expect(page.locator(".pantalla")).toBeVisible();
    await pantalla.antes?.(page);
    await revisar(page);
  });
}

test("el recorrido completo no tiene scroll en ninguna pantalla", async ({ page }) => {
  await page.goto("/?demo#/");
  await revisar(page);
  await page.getByRole("button", { name: "Contar alevinos" }).click();
  await page.getByRole("button", { name: "Bocachico" }).click();
  await page.getByRole("button", { name: "Mediano" }).click();
  await revisar(page);
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByRole("button", { name: "Ya pasaron todos" }).click();
  await revisar(page);
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByRole("button", { name: "1.500" }).click();
  await revisar(page);
  await page.getByRole("button", { name: "Empezar a contar" }).click();
  await revisar(page);
  await page.getByRole("button", { name: "Cerrar bolsa" }).click();
  await expect(page.getByText(/Bolsa 1 lista/)).toBeVisible();
  await revisar(page);
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByText("Conteo terminado")).toBeVisible();
  await revisar(page);
});
