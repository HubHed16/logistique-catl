package com.catl.tour.service.optimization;

import java.util.List;
import java.util.UUID;

public record HubPickingList(
        UUID hubId,
        UUID hubProducerId,
        GeoPoint location,
        List<UUID> stopIds,
        List<UUID> contributingProducers,
        double totalVolume,
        double openingCostEur
) {
}
