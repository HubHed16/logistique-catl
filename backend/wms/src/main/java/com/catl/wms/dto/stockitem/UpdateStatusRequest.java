package com.catl.wms.dto.stockitem;

import com.catl.wms.model.StockItem;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatusRequest {

    @NotNull(message = "Status is required")
    private StockItem.StockStatus status;

    private String reason;
}