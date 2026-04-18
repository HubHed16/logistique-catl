package com.catl.tour.service.optimization;

import java.util.UUID;

public record StopDemand(
        UUID stopId,
        UUID routeId,
        UUID producerId,
        int sequence,
        double latitude,
        double longitude,
        double volume
) {
}
