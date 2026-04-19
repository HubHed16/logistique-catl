package com.catl.tour.service.optimization;

/**
 * Type d'une tournée reconstruite côté optimisation.
 *
 * - DIRECT: départ dépôt producteur -> stops -> retour dépôt producteur
 * - BULK_TRANSFER: dépôt producteur -> hub -> dépôt producteur (livraison bulk)
 * - LAST_MILE: hub -> stops -> hub (distribution last-mile)
 */
public enum OptimizationTourType {
    DIRECT,
    BULK_TRANSFER,
    LAST_MILE
}

