import { test, expect } from "./fixtures";

/**
 * Smoke tests de navigation du back-office.
 * Chaque route testée isolément pour éviter l'accumulation de temps de
 * compilation à froid (dev server Next).
 */

test.describe("Back-office / navigation", () => {
  test("la page d'accueil charge et propose les raccourcis", async ({
    cleanPage: page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Back-office CATL" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Réception/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Zones/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Producteurs/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Simulateur/ }).first(),
    ).toBeVisible();
  });

  for (const [path, label] of [
    ["/zones", "Zones"],
    ["/reception", "Réception"],
    ["/producers", "Producteurs"],
    ["/simulator", "Simulateur"],
  ] as const) {
    test(`la nav permet d'atteindre ${path}`, async ({ cleanPage: page }) => {
      test.setTimeout(60_000);
      await page.goto("/");
      await page.locator(`nav a[href="${path}"]`).click();
      await page.waitForURL(new RegExp(`${path}$`), {
        waitUntil: "commit",
        timeout: 45_000,
      });
      await expect(
        page.locator(`nav a[href="${path}"]`).first(),
      ).toBeVisible();
      expect(label).toBeTruthy();
    });
  }

  test("aucun lien Historique ni Simulateur (legacy) dans la nav", async ({
    cleanPage: page,
  }) => {
    await page.goto("/");
    await expect(page.locator('nav a[href="/history"]')).toHaveCount(0);
    await expect(
      page.locator('nav a[href="/simulator/index.html"]'),
    ).toHaveCount(0);
  });
});
