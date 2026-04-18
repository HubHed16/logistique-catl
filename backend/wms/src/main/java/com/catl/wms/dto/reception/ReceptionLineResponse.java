package com.catl.wms.dto.reception;

import com.catl.wms.model.StockItem;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ReceptionLineResponse {

    private UUID orderLineId;
    private UUID stockItemId;
    private UUID productId;
    private String productName;
    private Float quantityOrdered;
    private Float quantityReceived;
    private Float discrepancy;
    private boolean hasDiscrepancy;
    private String lotNumber;
    private StockItem.StockStatus status;
}