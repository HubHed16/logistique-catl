import { test, expect } from "./fixtures";

/**
 * Tests de "parité" : le legacy reste accessible pendant la phase de port.
 * On vérifie qu'on peut toujours atteindre l'ancien simulateur et que les
 * features clés du legacy répondent (nombre de métiers, titre, éléments
 * critiques). Ces tests seront retirés en Phase 4 (suppression legacy).
 */

test.describe("Legacy simulator (fallback)", () => {
  test("la page legacy est accessible à /simulator/index.html", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    await expect(page.locator("#prod-band")).toBeVisible();
  });

  test("le legacy expose les 21 métiers (#pJobMenu)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    const checkboxes = page.locator("#pJobMenu input[type='checkbox']");
    await expect(checkboxes).toHaveCount(21);
  });

  test("le legacy expose les 5 types de véhicule (#vType)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    const options = page.locator("#vType option");
    await expect(options).toHaveCount(5);
  });

  test("le legacy expose les 5 énergies (#fType)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    const options = page.locator("#fType option");
    await expect(options).toHaveCount(5);
  });

  test("le legacy expose les 3 profils 'Qui livre' (#driverType)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    const options = page.locator("#driverType option");
    await expect(options).toHaveCount(3);
  });

  test("le legacy expose les 4 sliders de surface (surfSec/surfFrais/surfNeg/surfPrep)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    for (const id of ["surfSec", "surfFrais", "surfNeg", "surfPrep"]) {
      const el = page.locator(`#${id}`);
      await expect(el).toHaveAttribute("type", "range");
      await expect(el).toHaveAttribute("min", "0");
      await expect(el).toHaveAttribute("max", "200");
    }
  });

  test("le legacy expose le champ opération d'un arrêt avec 3 types (📦/🚜/🏬)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator/index.html");
    const options = page.locator("#sOpType option");
    await expect(options).toHaveCount(3);
    const values = await options.evaluateAll((els) =>
      els.map((el) => (el as HTMLOptionElement).value),
    );
    expect(values).toEqual(expect.arrayContaining(["📦", "🚜", "🏬"]));
  });
});
