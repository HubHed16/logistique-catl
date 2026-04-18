import { test, expect } from "./fixtures";

/**
 * Couverture fonctionnelle du simulateur API-intégré.
 * Flow principal : sélection / création producteur → édition identité,
 * infrastructure et véhicule, chacun avec son propre submit.
 *
 * NB : /producers est mocké localStorage tant que le back WMS n'a pas
 * implémenté le ProducerController. Les autres endpoints (infrastructure,
 * vehicles) tapent le vrai tour-api (docker compose up -d dans backend/tour).
 */

test.describe("Simulateur / producer", () => {
  test("la page /simulator charge et expose le sélecteur", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await expect(
      page.getByRole("heading", { name: "Simulateur logistique" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Choisir un producteur|Ferme de démo/ }),
    ).toBeVisible();
  });

  test("sans producteur sélectionné, affiche le panneau info", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await expect(
      page.getByText(/Aucun producteur sélectionné/i),
    ).toBeVisible();
  });

  test("le dropdown du sélecteur liste le producteur seed 'Ferme de démo'", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await expect(page.getByRole("button", { name: /^Ferme de démo/ })).toBeVisible();
  });

  test("sélectionner un producteur fait apparaître les 3 formulaires", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await expect(page.getByText("Espaces de travail")).toBeVisible();
    await expect(page.getByText("Véhicule & organisation")).toBeVisible();
  });

  test("créer un nouveau producteur via le formulaire inline", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /Nouveau producteur/ }).click();
    await page.getByLabel("Nom").fill("Ferme du Test E2E");
    await page.getByLabel("Email").fill("e2e@test.be");
    await page.getByRole("button", { name: /^Créer$/ }).click();
    // Après création, le producteur créé est auto-sélectionné
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await expect(
      page.locator("input[name='name']").first(),
    ).toHaveValue("Ferme du Test E2E");
  });

  test("le producteur sélectionné est restauré après reload (localStorage)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
  });

  test("les 21 métiers sont proposés en chips", async ({ cleanPage: page }) => {
    await page.goto("/simulator");
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

  test("les 3 types de véhicule de l'OpenAPI sont proposés", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    const typeSelect = page
      .locator("label")
      .filter({ hasText: /Type de véhicule/ })
      .locator("select");
    const options = await typeSelect.locator("option").allTextContents();
    for (const v of ["Fourgon", "Camion léger", "Camion lourd"]) {
      expect(options).toContain(v);
    }
  });

  test("le bouton 'Placer' bascule le mode pick (cursor crosshair)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    const map = page.locator(".leaflet-container");
    await expect(map).toHaveCSS("cursor", "grab");
    await page.getByRole("button", { name: /^Placer$/ }).click();
    await expect(map).toHaveCSS("cursor", "crosshair");
  });
});

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
