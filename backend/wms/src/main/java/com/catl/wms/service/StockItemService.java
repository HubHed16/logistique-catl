package com.catl.wms.service;

import com.catl.wms.dto.stockitem.StockItemRequest;
import com.catl.wms.dto.stockitem.StockItemResponse;
import com.catl.wms.dto.stockitem.UpdateStatusRequest;
import com.catl.wms.model.*;
import com.catl.wms.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StockItemService {

    private final StockItemRepository stockItemRepository;
    private final ProductRepository productRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final CooperativeRepository cooperativeRepository;



    @Transactional
    public StockItemResponse create(StockItemRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + request.getProductId()));

        StorageLocation location = storageLocationRepository.findById(request.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "StorageLocation not found: " + request.getLocationId()));

        Cooperative cooperative = cooperativeRepository.findById(request.getCooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.getCooperativeId()));

        StockItem stockItem = StockItem.builder()
                .product(product)
                .location(location)
                .cooperative(cooperative)
                .lotNumber(request.getLotNumber())
                .quantity(request.getQuantity())
                .unit(request.getUnit())
                .weightDeclared(request.getWeightDeclared())
                .weightActual(request.getWeightActual())
                .receptionDate(request.getReceptionDate())
                .expirationDate(request.getExpirationDate())
                .bestBefore(request.getBestBefore())
                .status(request.getStatus() != null ? request.getStatus() : StockItem.StockStatus.available)
                .statusReason(request.getStatusReason())
                .receptionTemp(request.getReceptionTemp())
                .build();

        stockItem = stockItemRepository.save(stockItem);
        return StockItemResponse.from(stockItem);
    }



    public StockItemResponse getById(UUID id) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + id));
        return StockItemResponse.from(stockItem);
    }

    public List<StockItemResponse> listAll() {
        return stockItemRepository.findAll().stream()
                .map(StockItemResponse::from)
                .toList();
    }

    public List<StockItemResponse> search(
            UUID productId,
            UUID cooperativeId,
            UUID locationId,
            StockItem.StockStatus status,
            String lotNumber) {

        return stockItemRepository.findWithFilters(productId, cooperativeId, locationId, status, lotNumber).stream()
                .map(StockItemResponse::from)
                .toList();
    }

    public List<StockItemResponse> findExpiringSoon(int daysAhead) {
        LocalDate limit = LocalDate.now().plusDays(daysAhead);
        return stockItemRepository.findExpiringBefore(limit).stream()
                .map(StockItemResponse::from)
                .toList();
    }

    public List<StockItemResponse> findLowStock(BigDecimal threshold) {
        return stockItemRepository.findLowStock(threshold).stream()
                .map(StockItemResponse::from)
                .toList();
    }


    @Transactional
    public StockItemResponse update(UUID id, StockItemRequest request) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + id));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + request.getProductId()));

        StorageLocation location = storageLocationRepository.findById(request.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "StorageLocation not found: " + request.getLocationId()));

        Cooperative cooperative = cooperativeRepository.findById(request.getCooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.getCooperativeId()));

        stockItem.setProduct(product);
        stockItem.setLocation(location);
        stockItem.setCooperative(cooperative);
        stockItem.setLotNumber(request.getLotNumber());
        stockItem.setQuantity(request.getQuantity());
        stockItem.setUnit(request.getUnit());
        stockItem.setWeightDeclared(request.getWeightDeclared());
        stockItem.setWeightActual(request.getWeightActual());
        stockItem.setReceptionDate(request.getReceptionDate());
        stockItem.setExpirationDate(request.getExpirationDate());
        stockItem.setBestBefore(request.getBestBefore());
        if (request.getStatus() != null) stockItem.setStatus(request.getStatus());
        stockItem.setStatusReason(request.getStatusReason());
        stockItem.setReceptionTemp(request.getReceptionTemp());

        stockItem = stockItemRepository.save(stockItem);
        return StockItemResponse.from(stockItem);
    }

    @Transactional
    public StockItemResponse updateStatus(UUID id, UpdateStatusRequest request) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + id));

        if (stockItem.getStatus() == StockItem.StockStatus.consumed) {
            throw new IllegalArgumentException("Cannot change status of a consumed stock item");
        }

        stockItem.setStatus(request.getStatus());
        stockItem.setStatusReason(request.getReason());

        stockItem = stockItemRepository.save(stockItem);
        return StockItemResponse.from(stockItem);
    }



    @Transactional
    public void delete(UUID id) {
        if (!stockItemRepository.existsById(id)) {
            throw new IllegalArgumentException("StockItem not found: " + id);
        }
        stockItemRepository.deleteById(id);
    }
}