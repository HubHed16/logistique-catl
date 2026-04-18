package com.catl.wms.dto.stockitem;

import com.catl.wms.model.StockItem;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class StockItemResponse {

    private UUID id;
    private UUID productId;
    private String productName;
    private UUID locationId;
    private String locationLabel;
    private UUID cooperativeId;
    private String cooperativeName;
    private String lotNumber;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal weightDeclared;
    private BigDecimal weightActual;
    private LocalDate receptionDate;
    private LocalDate expirationDate;
    private LocalDate bestBefore;
    private StockItem.StockStatus status;
    private String statusReason;
    private BigDecimal receptionTemp;

    public static StockItemResponse from(StockItem item) {
        return StockItemResponse.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .locationId(item.getLocation() != null ? item.getLocation().getId() : null)
                .locationLabel(item.getLocation() != null ? item.getLocation().getLabel() : null)
                .cooperativeId(item.getCooperative() != null ? item.getCooperative().getId() : null)
                .cooperativeName(item.getCooperative() != null ? item.getCooperative().getName() : null)
                .lotNumber(item.getLotNumber())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .weightDeclared(item.getWeightDeclared())
                .weightActual(item.getWeightActual())
                .receptionDate(item.getReceptionDate())
                .expirationDate(item.getExpirationDate())
                .bestBefore(item.getBestBefore())
                .status(item.getStatus())
                .statusReason(item.getStatusReason())
                .receptionTemp(item.getReceptionTemp())
                .build();
    }
}