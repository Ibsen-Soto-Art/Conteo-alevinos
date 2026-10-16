import { expect, test, type Page } from "@playwright/test";

/** Primera visita con internet: espera a que el service worker guarde la app completa. */
async function primeraVisita(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Contar alevinos" })).toBeVisible();
  // El service worker se activa cuando terminó de guardar todos los archivos.
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state), { timeout: 30_000 })
    .toBe("activated");
}

test("es instalable: manifiesto vertical, a pantalla completa y con íconos", async ({ page, request }) => {
  await page.goto("/");
  const enlace = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(enlace).toBeTruthy();
  const manifiesto = await (await request.get(enlace!)).json();
  expect(manifiesto).toMatchObject({
    name: "Contador de alevinos",
    short_name: "Alevinos",
    lang: "es",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
  });
  const tamanos = manifiesto.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}${i.purpose ? `-${i.purpose}` : ""}`);
  expect(tamanos).toEqual(expect.arrayContaining(["192x192", "512x512", "512x512-maskable"]));
  for (const icono of [...manifiesto.icons.map((i: { src: string }) => `/${i.src}`), "/apple-touch-icon.png"]) {
    expect((await request.get(icono)).status(), icono).toBe(200);
  }
});

test("abre sin internet después de la primera visita, con la letra guardada", async ({ page, context }) => {
  await primeraVisita(page);
  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole("button", { name: "Contar alevinos" })).toBeVisible();
  // Sin internet se piden los dos pesos de la letra: tienen que salir de lo guardado.
  const letra = await page.evaluate(async () => {
    const normal = await document.fonts.load('16px "Atkinson Hyperlegible"', "Faltan");
    const negrita = await document.fonts.load('bold 16px "Atkinson Hyperlegible"', "Faltan");
    return [...normal, ...negrita].map((f) => `${f.weight}:${f.status}`);
  });
  expect(letra).toEqual(["400:loaded", "700:loaded"]);
});

test("sin internet abren /laboratorio y las rutas con #", async ({ page, context }) => {
  await primeraVisita(page);
  await context.setOffline(true);

  await page.goto("/laboratorio");
  await expect(page.getByRole("heading", { name: "Laboratorio del motor" })).toBeVisible();

  await page.goto("/#/ayuda");
  await expect(page.getByRole("heading", { name: "Cómo contar" })).toBeVisible();

  await page.goto("/?demo#/resumen");
  await expect(page.getByText("Conteo terminado")).toBeVisible();
});

test("sin internet el motor cuenta (el Worker también quedó guardado)", async ({ page, context }) => {
  await primeraVisita(page);
  await context.setOffline(true);

  await page.goto("/?demo#/contando");
  const numero = async () => Number(((await page.locator(".contador-numero").textContent()) ?? "").replace(/\D/g, ""));
  const antes = await numero();
  await expect.poll(numero, { timeout: 30_000 }).toBeGreaterThan(antes + 5);
});
