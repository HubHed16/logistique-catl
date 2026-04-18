package com.catl.tour.service.optimization;

import java.util.List;
import java.util.UUID;

public record ProducerHubTransfer(
        UUID producerId,
        UUID hubId,
        double detourKm,
        double detourCostEur,
        double totalVolume,
        List<UUID> stopIds
) {
}
