package com.catl.tour.service.optimization;

import java.util.List;
import java.util.UUID;

/**
 * Une tournée reconstruite à partir du résultat d'optimisation.
 *
 * Objectif: fournir au front un modèle simple et cohérent pour tracer
 * plusieurs boucles (producteur ou hub en point de départ) sans implémenter
 * un VRP complet.
 */
public record OptimizationTour(
        String tourId,
        OptimizationTourType type,
        UUID producerId,
        UUID hubId,
        GeoPoint start,
        GeoPoint end,
        List<UUID> orderedStopIds,
        List<TourLeg> legs,
        double totalKm,
        double totalTravelCostEur
) {
}

