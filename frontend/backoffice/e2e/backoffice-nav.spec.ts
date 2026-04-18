import { test, expect } from "./fixtures";

/**
 * Smoke tests de navigation du back-office.
 * On teste chaque route indépendamment pour éviter l'accumulation de
 * temps de compilation du dev server Next (qui compile à froid route par
 * route).
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
      page.getByRole("link", { name: /Historique/ }).first(),
    ).toBeVisible();
  });

  for (const [path, label] of [
    ["/zones", "Zones"],
    ["/reception", "Réception"],
    ["/history", "Historique"],
    ["/simulator", "Simulateur"],
  ] as const) {
    test(`la nav permet d'atteindre ${path}`, async ({ cleanPage: page }) => {
      test.setTimeout(60_000); // dev server peut mettre ~15s à compiler à froid
      await page.goto("/");
      await page.locator(`nav a[href="${path}"]`).click();
      await page.waitForURL(new RegExp(`${path}$`), {
        waitUntil: "commit",
        timeout: 45_000,
      });
      await expect(
        page.locator(`nav a[href="${path}"]`).first(),
      ).toBeVisible();
      expect(label).toBeTruthy(); // garde la var utile pour le nom du test
    });
  }

  test("le lien Simulateur (legacy) pointe vers /simulator/index.html", async ({
    cleanPage: page,
  }) => {
    await page.goto("/");
    const href = await page
      .locator('nav a[href="/simulator/index.html"]')
      .getAttribute("href");
    expect(href).toBe("/simulator/index.html");
  });
});
