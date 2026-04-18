package com.catl.wms.dto.placement;

import com.catl.wms.model.StorageLocation;
import com.catl.wms.model.StorageZone;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AvailableLocationResponse {

    private UUID locationId;
    private String label;
    private String rack;
    private String position;
    private UUID zoneId;
    private String zoneName;
    private StorageZone.ZoneType zoneType;

    public static AvailableLocationResponse from(StorageLocation loc) {
        return AvailableLocationResponse.builder()
                .locationId(loc.getId())
                .label(loc.getLabel())
                .rack(loc.getRack())
                .position(loc.getPosition())
                .zoneId(loc.getZone() != null ? loc.getZone().getId() : null)
                .zoneName(loc.getZone() != null ? loc.getZone().getName() : null)
                .zoneType(loc.getZone() != null ? loc.getZone().getType() : null)
                .build();
    }
}