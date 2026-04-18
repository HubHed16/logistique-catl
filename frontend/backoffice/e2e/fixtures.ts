/* eslint-disable react-hooks/rules-of-hooks -- noms "use*" des fixtures Playwright trompent le linter React */
import { test as base, type Page } from "@playwright/test";

/**
 * Fixture qui garantit un localStorage simulateur vide avant chaque test.
 */
export const test = base.extend<{ cleanPage: Page }>({
  cleanPage: async ({ page, baseURL }, usePage) => {
    // Purge localStorage une seule fois en début de test (pas sur chaque
    // navigation, sinon un reload efface l'état qu'on veut vérifier).
    await page.goto(baseURL ?? "http://localhost:3000");
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
      } catch {
        // ignore
      }
    });
    await usePage(page);
  },
});

export { expect } from "@playwright/test";

/**
 * Remplit le formulaire dépôt avec des valeurs valides minimales.
 */
export async function fillDepot(page: Page) {
  await page.goto("/simulator");
  await page.getByLabel("Nom de la ferme / point de départ").fill("Ferme de test");
  await page.getByLabel("Adresse du dépôt").fill("Rue des Guillemins, Liège");
  await page.getByRole("button", { name: /^Maraîchage$/ }).click();
  // Positionner le dépôt via clic carte (centre de la carte = Liège)
  await page.getByRole("button", { name: /Placer sur la carte/i }).click();
  const map = page.locator(".leaflet-container");
  const box = await map.boundingBox();
  if (!box) throw new Error("Leaflet container introuvable");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
