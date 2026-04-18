package com.catl.wms.dto.order;

import com.catl.wms.model.Order;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class OrderRequest {

    @NotNull(message = "Cooperative ID is required")
    private UUID cooperativeId;

    @NotNull(message = "Client name is required")
    private String clientName;

    @NotNull(message = "Client type is required")
    private Order.ClientType clientType;

    @NotNull(message = "Channel is required")
    private Order.OrderChannel channel;
}