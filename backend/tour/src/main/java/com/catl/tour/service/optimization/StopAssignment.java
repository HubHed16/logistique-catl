package com.catl.tour.service.optimization;

import java.util.UUID;

public record StopAssignment(
        UUID stopId,
        UUID routeId,
        UUID producerId,
        int sequence,
        Mode mode,
        UUID hubId,
        double volume,
        double directCostEur,
        double viaHubCostEur,
        double latitude,
        double longitude
) {
    public enum Mode { DIRECT, VIA_HUB }
}
