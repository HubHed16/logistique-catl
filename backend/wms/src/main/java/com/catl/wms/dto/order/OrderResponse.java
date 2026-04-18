package com.catl.wms.dto.order;

import com.catl.wms.model.Order;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OrderResponse {

    private UUID id;
    private UUID cooperativeId;
    private String clientName;
    private Order.ClientType clientType;
    private Order.OrderChannel channel;
    private Order.OrderStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime shippedAt;
    private int totalLines;
    private List<OrderLineResponse> lines;

    public static OrderResponse from(Order order, List<OrderLineResponse> lines) {
        return OrderResponse.builder()
                .id(order.getId())
                .cooperativeId(order.getCooperative() != null ? order.getCooperative().getId() : null)
                .clientName(order.getClientName())
                .clientType(order.getClientType())
                .channel(order.getChannel())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .shippedAt(order.getShippedAt())
                .totalLines(lines != null ? lines.size() : 0)
                .lines(lines)
                .build();
    }
}