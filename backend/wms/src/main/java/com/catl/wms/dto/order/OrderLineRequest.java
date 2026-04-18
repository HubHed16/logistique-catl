package com.catl.wms.dto.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.UUID;

@Data
public class OrderLineRequest {

    @NotNull(message = "Product ID is required")
    private UUID productId;

    @NotNull(message = "Quantity ordered is required")
    @Positive(message = "Quantity must be positive")
    private Float quantityOrdered;

    @NotNull(message = "Unit is required")
    private String unit;
}