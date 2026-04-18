package com.catl.wms.dto.reception;

import com.catl.wms.model.StockItem;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ReceptionResponse {

    private UUID stockItemId;
    private UUID productId;
    private String productName;
    private UUID cooperativeId;
    private String lotNumber;
    private Float quantity;
    private String unit;
    private Float weightDeclared;
    private Float receptionTemp;
    private LocalDate receptionDate;
    private LocalDate expirationDate;
    private LocalDate bestBefore;
    private StockItem.StockStatus status;
    private UUID movementId;

    public static ReceptionResponse from(StockItem item, UUID movementId) {
        return ReceptionResponse.builder()
                .stockItemId(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .cooperativeId(item.getCooperative().getId())
                .lotNumber(item.getLotNumber())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .weightDeclared(item.getWeightDeclared())
                .receptionTemp(item.getReceptionTemp())
                .receptionDate(item.getReceptionDate())
                .expirationDate(item.getExpirationDate())
                .bestBefore(item.getBestBefore())
                .status(item.getStatus())
                .movementId(movementId)
                .build();
    }
}