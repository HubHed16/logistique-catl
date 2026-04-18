import { test, expect } from "./fixtures";

/**
 * /simulator : page focalisée sur la planification de tournées.
 * Le CRUD producteur/infra/véhicules vit désormais sur /producers.
 */

test.describe("/simulator", () => {
  test("charge et affiche le sélecteur + panneau info sans producteur", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await expect(
      page.getByRole("heading", { name: "Simulateur logistique" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Choisir un producteur|Ferme de démo/,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Aucun producteur sélectionné/i),
    ).toBeVisible();
  });

  test("sélectionner un producteur affiche le récap + lien vers /producers", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    await expect(page.getByText(/Producteur actif/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Gérer ce producteur/ }),
    ).toBeVisible();
  });

  test("pas de formulaires dépôt sur /simulator (moved to /producers)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page
      .getByRole("button", { name: /Choisir un producteur|Ferme de démo/ })
      .click();
    await page.getByRole("button", { name: /^Ferme de démo/ }).click();
    // Ces sections sont maintenant sur /producers
    await expect(page.getByText("Identité de la ferme")).toHaveCount(0);
    await expect(page.getByText("Espaces de travail")).toHaveCount(0);
  });
});
