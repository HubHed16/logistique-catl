package com.catl.tour.service.optimization;

import java.util.UUID;

public record HubCandidate(
        UUID infrastructureId,
        UUID producerId,
        GeoPoint location,
        double handlingFeePerUnit,
        double openingFee
) {
}
