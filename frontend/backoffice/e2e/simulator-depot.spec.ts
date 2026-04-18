import { test, expect, fillDepot } from "./fixtures";

/**
 * Couverture fonctionnelle du formulaire dépôt — parité avec le simulateur
 * legacy (cf. frontend/backoffice/public/simulator/index.html).
 *
 * Les IDs legacy auxquels chaque test réfère sont rappelés en commentaire
 * afin de faciliter la revue "1:1" avec l'ancien simulateur.
 */

test.describe("Simulateur / dépôt", () => {
  test("la page /simulator charge et affiche les 3 étapes", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await expect(
      page.getByRole("heading", { name: "Simulateur logistique" }),
    ).toBeVisible();
    // Stepper avec Dépôt / Tournées / Export
    await expect(page.getByText("Dépôt", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tournées", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Export", { exact: true }).first()).toBeVisible();
  });

  test("les 4 blocs du dépôt (Identité / Transport / Organisation / Surfaces) sont présents", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await expect(page.getByText("Paramètres transport")).toBeVisible();
    await expect(page.getByText("Organisation logistique")).toBeVisible();
    await expect(page.getByText("Espaces de travail")).toBeVisible();
  });

  test("les 21 métiers sont proposés en chips (parité legacy pJobMenu)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const expected = [
      "Maraîchage",
      "Céréales panifiables",
      "Grandes cultures (céréales)",
      "Fruiticulture",
      "Bovins laitiers",
      "Ovins Laitiers",
      "Caprins Laitiers",
      "Viande Bovine",
      "Viande Ovine",
      "Viande porcine",
      "Cuniculture",
      "Aviculture viandes",
      "Aviculture oeufs",
      "Viande caprine",
      "Floriculture/Herboristerie",
      "Apiculture",
      "Aquaculture (poissons)",
      "Myciculture (Champignons)",
      "Héliciculture",
      "Arboriculture Forestière",
      "Autres",
    ];
    for (const name of expected) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${escapeRe(name)}$`) }),
      ).toBeVisible();
    }
  });

  test("cliquer un métier le bascule actif/inactif (aria-pressed)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const chip = page.getByRole("button", { name: /^Maraîchage$/ });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  test("les 5 types de véhicule du legacy sont proposés (vType)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const expected = [
      "Petit utilitaire (< 3m³)",
      "Fourgon compact (3-6m³)",
      "Grand fourgon (6-12m³)",
      "Petit camion (12-20m³)",
      "Camion lourd (> 20m³)",
    ];
    const options = await page
      .locator("select")
      .first()
      .locator("option")
      .allTextContents();
    for (const v of expected) {
      expect(options).toContain(v);
    }
  });

  test("les 5 énergies du legacy sont proposées (fType)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const expected = ["Diesel", "Essence", "Électrique", "GNV / Gaz", "Hybride"];
    const fuelSelect = page.locator("select").nth(1);
    const options = await fuelSelect.locator("option").allTextContents();
    for (const v of expected) {
      expect(options).toContain(v);
    }
  });

  test("les 3 profils 'Qui livre' du legacy sont proposés (driverType)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const expected = [
      "Producteur.rice (Soi-même)",
      "Salarié",
      "Prestataire Extérieur",
    ];
    const driverSelect = page.locator("select").nth(2);
    const options = await driverSelect.locator("option").allTextContents();
    for (const v of expected) {
      expect(options).toContain(v);
    }
  });

  test("la case 'Réfrigéré' bascule le state (parité vFrigo)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const frigo = page
      .locator("label")
      .filter({ hasText: /Réfrigéré/ })
      .locator("input[type='checkbox']");
    await expect(frigo).not.toBeChecked();
    await frigo.check();
    await expect(frigo).toBeChecked();
    await frigo.uncheck();
    await expect(frigo).not.toBeChecked();
  });

  test("les 4 sliders de surface existent (sec/frais/neg/prep, 0-200 pas 5)", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const expected = [
      "Stockage Sec",
      "Stockage Frais",
      "Stock. Négatif (T°<0)",
      "Espace Prépa.",
    ];
    for (const label of expected) {
      const range = page.getByLabel(label);
      await expect(range).toBeVisible();
      await expect(range).toHaveAttribute("type", "range");
      await expect(range).toHaveAttribute("min", "0");
      await expect(range).toHaveAttribute("max", "200");
      await expect(range).toHaveAttribute("step", "5");
    }
  });

  test("les valeurs par défaut des champs transport sont celles du legacy", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    // Legacy : cons=8.5, price=1.75, amort=0.25, cH=18, tPrep=30, tLoad=20
    await expect(page.locator("input[name='vehCons']")).toHaveValue("8.5");
    await expect(page.locator("input[name='fuelPrice']")).toHaveValue("1.75");
    await expect(page.locator("input[name='vehAmort']")).toHaveValue("0.25");
    await expect(page.locator("input[name='cH']")).toHaveValue("18");
    await expect(page.locator("input[name='tPrep']")).toHaveValue("30");
    await expect(page.locator("input[name='tLoad']")).toHaveValue("20");
  });

  test("le bouton 'Valider le dépôt' reste désactivé tant que le form est incomplet", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const submit = page.getByRole("button", {
      name: /Valider le dépôt/,
    });
    await expect(submit).toBeDisabled();
    // Un champ seulement : toujours désactivé
    await page
      .getByLabel("Nom de la ferme / point de départ")
      .fill("Une ferme");
    await expect(submit).toBeDisabled();
  });

  test("remplir tout le form active le bouton et permet de verrouiller le dépôt", async ({
    cleanPage: page,
  }) => {
    await fillDepot(page);
    const submit = page.getByRole("button", { name: /Valider le dépôt/ });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText(/Dépôt verrouillé/i)).toBeVisible();
    await expect(page.getByText("Ferme de test")).toBeVisible();
  });

  test("le mode 'Placer' change le curseur en crosshair sur la carte", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    const map = page.locator(".leaflet-container");
    await expect(map).toHaveCSS("cursor", "grab");
    await page.getByRole("button", { name: /Placer sur la carte/i }).click();
    await expect(map).toHaveCSS("cursor", "crosshair");
  });

  test("cliquer sur la carte en mode 'Placer' pose un marqueur orange dépôt", async ({
    cleanPage: page,
  }) => {
    await page.goto("/simulator");
    await page.getByRole("button", { name: /Placer sur la carte/i }).click();
    const map = page.locator(".leaflet-container");
    const box = await map.boundingBox();
    if (!box) throw new Error("Leaflet container introuvable");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".catl-depot-marker").first()).toBeVisible();
  });

  test("le dépôt verrouillé peut être modifié (retour en édition)", async ({
    cleanPage: page,
  }) => {
    await fillDepot(page);
    await page.getByRole("button", { name: /Valider le dépôt/ }).click();
    await expect(page.getByText(/Dépôt verrouillé/i)).toBeVisible();
    await page.getByRole("button", { name: "Modifier" }).click();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
  });

  test("après reload, le dépôt verrouillé est restauré depuis localStorage", async ({
    cleanPage: page,
  }) => {
    await fillDepot(page);
    await page.getByRole("button", { name: /Valider le dépôt/ }).click();
    await expect(page.getByText(/Dépôt verrouillé/i)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Dépôt verrouillé/i)).toBeVisible();
    await expect(page.getByText("Ferme de test")).toBeVisible();
  });

  test("'Réinitialiser tout' vide le projet et revient en édition", async ({
    cleanPage: page,
  }) => {
    await fillDepot(page);
    await page.getByRole("button", { name: /Valider le dépôt/ }).click();
    await expect(page.getByText(/Dépôt verrouillé/i)).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Réinitialiser tout/i }).click();
    await expect(page.getByText("Identité de la ferme")).toBeVisible();
    await expect(page.locator("input[name='name']")).toHaveValue("");
  });
});

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
