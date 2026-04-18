package com.catl.wms.dto.reception;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class QualityControlRequest {

    @NotNull(message = "Stock item ID is required")
    private UUID stockItemId;

    @NotNull(message = "Result is required (true = OK, false = KO)")
    private Boolean passed;

    private String reason;

    private UUID operatorId;
}