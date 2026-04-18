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
