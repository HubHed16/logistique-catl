package com.catl.wms.dto.order;

import com.catl.wms.model.OrderLine;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class OrderLineResponse {

    private UUID id;
    private UUID orderId;
    private UUID productId;
    private String productName;
    private UUID stockItemId;
    private Float quantityOrdered;
    private Float quantityPicked;
    private String unit;

    public static OrderLineResponse from(OrderLine line) {
        return OrderLineResponse.builder()
                .id(line.getId())
                .orderId(line.getOrder() != null ? line.getOrder().getId() : null)
                .productId(line.getProduct() != null ? line.getProduct().getId() : null)
                .productName(line.getProduct() != null ? line.getProduct().getName() : null)
                .stockItemId(line.getStockItem() != null ? line.getStockItem().getId() : null)
                .quantityOrdered(line.getQuantityOrdered())
                .quantityPicked(line.getQuantityPicked())
                .unit(line.getUnit())
                .build();
    }
}