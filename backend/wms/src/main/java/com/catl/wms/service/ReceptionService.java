package com.catl.wms.service;

import com.catl.wms.dto.reception.*;
import com.catl.wms.model.*;
import com.catl.wms.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceptionService {

    private final OrderRepository orderRepository;
    private final OrderLineRepository orderLineRepository;
    private final StockItemRepository stockItemRepository;

    @Transactional
    public ReceptionResponse receiveOrder(ReceptionRequest request) {


        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Order not found: " + request.getOrderId()));


        if (order.getStatus() == Order.OrderStatus.DELIVERED
                || order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Order cannot be received, current status: " + order.getStatus());
        }

        List<ReceptionLineResponse> lineResponses = new ArrayList<>();
        int discrepancyCount = 0;


        for (ReceptionLineItem lineItem : request.getLines()) {

            OrderLine orderLine = orderLineRepository.findById(lineItem.getOrderLineId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "OrderLine not found: " + lineItem.getOrderLineId()));


            if (!orderLine.getOrder().getId().equals(order.getId())) {
                throw new IllegalArgumentException(
                        "OrderLine " + orderLine.getId() + " does not belong to Order " + order.getId());
            }


            Float qtyOrdered = orderLine.getQuantityOrdered() != null ? orderLine.getQuantityOrdered() : 0f;
            Float qtyReceived = lineItem.getQuantityReceived();
            Float discrepancy = qtyReceived - qtyOrdered;
            boolean hasDiscrepancy = Math.abs(discrepancy) > 0.001f;
            if (hasDiscrepancy) discrepancyCount++;


            StockItem stockItem = StockItem.builder()
                    .product(orderLine.getProduct())
                    .cooperative(order.getCooperative())
                    .lotNumber(lineItem.getLotNumber())
                    .quantity(qtyReceived)
                    .unit(orderLine.getUnit())
                    .weightActual(lineItem.getWeightActual())
                    .receptionDate(request.getReceptionDate())
                    .expirationDate(lineItem.getExpirationDate())
                    .bestBefore(lineItem.getBestBefore())
                    .receptionTemp(request.getReceptionTemp())
                    .status(StockItem.StockStatus.AVAILABLE)
                    .statusReason(hasDiscrepancy ? "Quantity discrepancy: " + discrepancy : null)
                    .build();

            stockItem = stockItemRepository.save(stockItem);


            orderLine.setStockItem(stockItem);
            orderLine.setQuantityPicked(qtyReceived);
            orderLineRepository.save(orderLine);

            lineResponses.add(ReceptionLineResponse.builder()
                    .orderLineId(orderLine.getId())
                    .stockItemId(stockItem.getId())
                    .productId(orderLine.getProduct().getId())
                    .productName(orderLine.getProduct().getName())
                    .quantityOrdered(qtyOrdered)
                    .quantityReceived(qtyReceived)
                    .discrepancy(discrepancy)
                    .hasDiscrepancy(hasDiscrepancy)
                    .lotNumber(lineItem.getLotNumber())
                    .status(stockItem.getStatus())
                    .build());
        }


        order.setStatus(Order.OrderStatus.CONFIRMED);
        order = orderRepository.save(order);

        return ReceptionResponse.builder()
                .orderId(order.getId())
                .orderStatus(order.getStatus())
                .receptionDate(request.getReceptionDate())
                .receptionTemp(request.getReceptionTemp())
                .totalLines(lineResponses.size())
                .linesWithDiscrepancy(discrepancyCount)
                .lines(lineResponses)
                .build();
    }

    /**
     * Scan de confirmation physique (met à jour le poids réel si besoin).
     */
    @Transactional
    public ReceptionLineResponse scanReception(UUID stockItemId, Float weightActual, UUID operatorId) {

        StockItem stockItem = stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + stockItemId));

        if (weightActual != null) {
            stockItem.setWeightActual(weightActual);
        }

        stockItem = stockItemRepository.save(stockItem);

        return ReceptionLineResponse.builder()
                .stockItemId(stockItem.getId())
                .productId(stockItem.getProduct().getId())
                .productName(stockItem.getProduct().getName())
                .quantityReceived(stockItem.getQuantity())
                .lotNumber(stockItem.getLotNumber())
                .status(stockItem.getStatus())
                .build();
    }
}