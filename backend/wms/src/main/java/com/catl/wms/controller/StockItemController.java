package com.catl.wms.controller;

import com.catl.wms.dto.stockitem.StockItemRequest;
import com.catl.wms.dto.stockitem.StockItemResponse;
import com.catl.wms.dto.stockitem.UpdateStatusRequest;
import com.catl.wms.model.StockItem;
import com.catl.wms.service.StockItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stock-items")
@RequiredArgsConstructor
public class StockItemController {

    private final StockItemService stockItemService;



    @PostMapping
    public ResponseEntity<StockItemResponse> create(@Valid @RequestBody StockItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockItemService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockItemResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(stockItemService.getById(id));
    }

    @GetMapping
    public ResponseEntity<Page<StockItemResponse>> list(
            @PageableDefault(size = 20, sort = "receptionDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(stockItemService.list(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StockItemResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody StockItemRequest request) {
        return ResponseEntity.ok(stockItemService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        stockItemService.delete(id);
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/search")
    public ResponseEntity<Page<StockItemResponse>> search(
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) UUID cooperativeId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) StockItem.StockStatus status,
            @RequestParam(required = false) String lotNumber,
            @PageableDefault(size = 20, sort = "receptionDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(
                stockItemService.search(productId, cooperativeId, locationId, status, lotNumber, pageable));
    }



    @GetMapping("/expiring-soon")
    public ResponseEntity<List<StockItemResponse>> expiringSoon(
            @RequestParam(defaultValue = "7") int daysAhead) {
        return ResponseEntity.ok(stockItemService.findExpiringSoon(daysAhead));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<StockItemResponse>> lowStock(
            @RequestParam(defaultValue = "10.0") BigDecimal threshold) {
        return ResponseEntity.ok(stockItemService.findLowStock(threshold));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<StockItemResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {
        return ResponseEntity.ok(stockItemService.updateStatus(id, request));
    }
}