package com.catl.tour.service.optimization;

import java.util.List;
import java.util.UUID;

/**
 * Résultat d'une reconstruction de trajet (ordre + legs).
 */
public record TourPathResult(
        UUID routeId,
        UUID producerId,
        UUID vehicleId,
        List<UUID> orderedStopIds,
        List<TourLeg> legs,
        double totalKm,
        double totalTravelCostEur
) {
}

