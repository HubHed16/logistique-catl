import { test, expect } from "./fixtures";

/**
 * CRUD producteurs : identity, infrastructure, véhicules (multi).
 *
 * /producers mocke `/producers*` en localStorage côté front (front
 * `lib/apigen/mocks/producers.ts`) tant que le WMS n'expose pas son
 * ProducerController. Infrastructure et véhicules tapent le vrai tour-api.
 */

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("/producers", () => {
  test("charge et affiche le sélecteur", async ({ cleanPage: page }) => {
    await page.goto("/producers");
    await expect(
      page.getByRole("heading", { name: /^Producteurs$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Choisir un producteur|Ferme de démo/,
      }),
    ).toBeVisible();
  });

  test("panneau info quand aucun producteur sélectionné", async ({
    cleanPage: page,
  }) => {
    await page.goto("/producers");
    await expect(
      page.getByText(/Aucun producteur sélectionné/i),
    ).toBeVisible();
  });

  test("sélectionner un producteur fait apparaître identity + surfaces + véhicules", async ({
    cleanPage: page,
  }) => {
    await page.goto("/producers");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await expect(page.getByText("Espaces de travail")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Véhicules/ }),
    ).toBeVisible();
  });

  test("les 21 métiers sont proposés en chips", async ({ cleanPage: page }) => {
    await page.goto("/producers");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    const expected = [
      "Maraîchage",
      "Céréales panifiables",
      "Fruiticulture",
      "Bovins laitiers",
      "Viande Bovine",
      "Apiculture",
      "Aquaculture (poissons)",
      "Héliciculture",
      "Autres",
    ];
    for (const name of expected) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${escapeRe(name)}$`) }),
      ).toBeVisible();
    }
  });

  test("peut ajouter puis supprimer un véhicule", async ({
    cleanPage: page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/producers");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();

    // Add
    await page
      .getByRole("button", { name: /Nouveau véhicule/ })
      .click();
    await page.getByRole("button", { name: /Créer le véhicule/ }).click();
    // La carte du véhicule créé apparaît (texte "Fourgon" + "Diesel")
    await expect(page.getByText(/^Fourgon$/)).toBeVisible();

    // Delete
    const deleteBtn = page
      .getByRole("button", { name: /Supprimer le véhicule/ })
      .first();
    await deleteBtn.click();
    await page.getByRole("button", { name: /^Supprimer$/ }).click();
    // Attente que la carte disparaisse (au moins une)
    await expect(
      page.getByText(/Aucun véhicule enregistré/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("créer un producteur inline l'auto-sélectionne", async ({
    cleanPage: page,
  }) => {
    await page.goto("/producers");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /Nouveau producteur/ }).click();
    await page.getByLabel("Nom").fill("Ferme E2E");
    await page.getByLabel("Email").fill("e2e@test.be");
    await page.getByRole("button", { name: /^Créer$/ }).click();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await expect(page.locator("input[name='name']").first()).toHaveValue(
      "Ferme E2E",
    );
  });
});
