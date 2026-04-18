package com.catl.wms.dto.order;

import com.catl.wms.model.Order;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class OrderRequest {

    @NotNull(message = "Cooperative ID is required")
    private UUID cooperativeId;

}