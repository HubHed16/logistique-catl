package com.catl.tour.service.optimization;

import java.util.UUID;

/**
 * Un segment de trajet entre deux points successifs d'une tournée.
 */
public record TourLeg(
        UUID fromStopId,
        UUID toStopId,
        GeoPoint from,
        GeoPoint to,
        double km,
        double travelCostEur
) {
}

