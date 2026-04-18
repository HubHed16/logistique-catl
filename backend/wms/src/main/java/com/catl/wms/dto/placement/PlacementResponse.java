package com.catl.wms.dto.placement;

import com.catl.wms.model.StockItem;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PlacementResponse {

    private UUID stockItemId;
    private UUID productId;
    private String productName;
    private UUID locationId;
    private String locationLabel;
    private String rack;
    private String position;
    private UUID zoneId;
    private String zoneName;
    private StockItem.StockStatus status;

    public static PlacementResponse from(StockItem item) {
        return PlacementResponse.builder()
                .stockItemId(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .locationId(item.getLocation() != null ? item.getLocation().getId() : null)
                .locationLabel(item.getLocation() != null ? item.getLocation().getLabel() : null)
                .rack(item.getLocation() != null ? item.getLocation().getRack() : null)
                .position(item.getLocation() != null ? item.getLocation().getPosition() : null)
                .zoneId(item.getLocation() != null && item.getLocation().getZone() != null
                        ? item.getLocation().getZone().getId() : null)
                .zoneName(item.getLocation() != null && item.getLocation().getZone() != null
                        ? item.getLocation().getZone().getName() : null)
                .status(item.getStatus())
                .build();
    }
}