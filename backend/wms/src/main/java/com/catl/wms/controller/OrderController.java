package com.catl.wms.controller;

import com.catl.wms.dto.order.*;
import com.catl.wms.model.Order;
import com.catl.wms.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // ===== CRUD =====

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody OrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(request));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> get(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrder(orderId));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> list() {
        return ResponseEntity.ok(orderService.listOrders());
    }

    @PutMapping("/{orderId}")
    public ResponseEntity<OrderResponse> update(
            @PathVariable UUID orderId,
            @Valid @RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.updateOrder(orderId, request));
    }

    @DeleteMapping("/{orderId}")
    public ResponseEntity<Void> delete(@PathVariable UUID orderId) {
        orderService.deleteOrder(orderId);
        return ResponseEntity.noContent().build();
    }

    // ===== FILTRES AVANCÉS =====

    @GetMapping("/search")
    public ResponseEntity<List<OrderResponse>> search(
            @RequestParam(required = false) Order.OrderStatus status,
            @RequestParam(required = false) UUID cooperativeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo) {

        return ResponseEntity.ok(orderService.searchOrders(
                status, cooperativeId, dateFrom, dateTo));
    }

    // ===== STATUS TRANSITIONS =====

    @PostMapping("/{orderId}/confirm")
    public ResponseEntity<OrderResponse> confirm(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.confirmOrder(orderId));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancel(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId));
    }

    // ===== ORDER LINES =====

    @GetMapping("/{orderId}/lines")
    public ResponseEntity<List<OrderLineResponse>> getLines(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrderLines(orderId));
    }

    @PostMapping("/{orderId}/lines")
    public ResponseEntity<OrderLineResponse> addLine(
            @PathVariable UUID orderId,
            @Valid @RequestBody OrderLineRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.addLine(orderId, request));
    }

    @DeleteMapping("/{orderId}/lines/{lineId}")
    public ResponseEntity<Void> removeLine(
            @PathVariable UUID orderId,
            @PathVariable UUID lineId) {
        orderService.removeLine(orderId, lineId);
        return ResponseEntity.noContent().build();
    }
}