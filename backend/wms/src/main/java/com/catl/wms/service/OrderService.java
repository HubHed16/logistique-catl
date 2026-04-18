package com.catl.wms.service;

import com.catl.wms.dto.order.*;
import com.catl.wms.model.*;
import com.catl.wms.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderLineRepository orderLineRepository;
    private final ProductRepository productRepository;
    private final CooperativeRepository cooperativeRepository;



    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        Cooperative cooperative = cooperativeRepository.findById(request.getCooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.getCooperativeId()));

        Order order = Order.builder()
                .cooperative(cooperative)
                .status(Order.OrderStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        order = orderRepository.save(order);
        return OrderResponse.from(order, List.of());
    }

    public OrderResponse getOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Order not found: " + orderId));

        List<OrderLineResponse> lines = orderLineRepository.findByOrderId(orderId)
                .stream()
                .map(OrderLineResponse::from)
                .toList();

        return OrderResponse.from(order, lines);
    }

    public List<OrderResponse> listOrders() {
        return orderRepository.findAll().stream()
                .map(o -> {
                    List<OrderLineResponse> lines = orderLineRepository.findByOrderId(o.getId())
                            .stream().map(OrderLineResponse::from).toList();
                    return OrderResponse.from(o, lines);
                })
                .toList();
    }

    public List<OrderResponse> searchOrders(
            Order.OrderStatus status,
            UUID cooperativeId,
            LocalDateTime dateFrom,
            LocalDateTime dateTo) {

        return orderRepository.findWithFilters(status, cooperativeId, dateFrom, dateTo)
                .stream()
                .map(o -> {
                    List<OrderLineResponse> lines = orderLineRepository.findByOrderId(o.getId())
                            .stream().map(OrderLineResponse::from).toList();
                    return OrderResponse.from(o, lines);
                })
                .toList();
    }

    @Transactional
    public OrderResponse updateOrder(UUID orderId, OrderRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Order can only be updated when status is PENDING. Current: " + order.getStatus());
        }

        Cooperative cooperative = cooperativeRepository.findById(request.getCooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.getCooperativeId()));

        order.setCooperative(cooperative);
        order = orderRepository.save(order);

        List<OrderLineResponse> lines = orderLineRepository.findByOrderId(orderId)
                .stream().map(OrderLineResponse::from).toList();

        return OrderResponse.from(order, lines);
    }

    @Transactional
    public void deleteOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() != Order.OrderStatus.PENDING
                && order.getStatus() != Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Order cannot be deleted in status: " + order.getStatus());
        }


        List<OrderLine> lines = orderLineRepository.findByOrderId(orderId);
        orderLineRepository.deleteAll(lines);

        orderRepository.delete(order);
    }



    @Transactional
    public OrderResponse confirmOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only PENDING orders can be confirmed. Current: " + order.getStatus());
        }

        List<OrderLine> lines = orderLineRepository.findByOrderId(orderId);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Cannot confirm an order without lines");
        }

        order.setStatus(Order.OrderStatus.CONFIRMED);
        order = orderRepository.save(order);

        List<OrderLineResponse> lineResponses = lines.stream().map(OrderLineResponse::from).toList();
        return OrderResponse.from(order, lineResponses);
    }

    @Transactional
    public OrderResponse cancelOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() == Order.OrderStatus.DELIVERED
                || order.getStatus() == Order.OrderStatus.SHIPPED) {
            throw new IllegalArgumentException(
                    "Cannot cancel an order that is " + order.getStatus());
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        order = orderRepository.save(order);

        List<OrderLineResponse> lines = orderLineRepository.findByOrderId(orderId)
                .stream().map(OrderLineResponse::from).toList();

        return OrderResponse.from(order, lines);
    }



    @Transactional
    public OrderLineResponse addLine(UUID orderId, OrderLineRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Lines can only be added to PENDING orders. Current: " + order.getStatus());
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + request.getProductId()));

        OrderLine line = OrderLine.builder()
                .order(order)
                .product(product)
                .quantityOrdered(request.getQuantityOrdered())
                .unit(request.getUnit())
                .build();

        line = orderLineRepository.save(line);
        return OrderLineResponse.from(line);
    }

    @Transactional
    public void removeLine(UUID orderId, UUID lineId) {
        OrderLine line = orderLineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("OrderLine not found: " + lineId));

        if (!line.getOrder().getId().equals(orderId)) {
            throw new IllegalArgumentException(
                    "OrderLine " + lineId + " does not belong to Order " + orderId);
        }

        if (line.getOrder().getStatus() != Order.OrderStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Lines can only be removed from PENDING orders. Current: " + line.getOrder().getStatus());
        }

        orderLineRepository.delete(line);
    }

    public List<OrderLineResponse> getOrderLines(UUID orderId) {
        return orderLineRepository.findByOrderId(orderId).stream()
                .map(OrderLineResponse::from)
                .toList();
    }
}