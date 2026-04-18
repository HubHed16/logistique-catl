package com.catl.wms.service;

import com.catl.wms.dto.stockitem.StockItemDto;
import com.catl.wms.dto.stockitem.UpdateStatusRequest;
import com.catl.wms.model.*;
import com.catl.wms.repository.*;
import com.catl.wms.service.mapper.StockItemMapper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final StockItemMapper stockItemMapper;


    @Transactional
    public StockItemDto create(StockItemDto request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + request.productId()));

        StorageLocation location = storageLocationRepository.findById(request.locationId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "StorageLocation not found: " + request.locationId()));

        Cooperative cooperative = cooperativeRepository.findById(request.cooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.cooperativeId()));

        StockItem stockItem = StockItem.builder()
                .product(product)
                .location(location)
                .cooperative(cooperative)
                .lotNumber(request.lotNumber())
                .quantity(request.quantity().floatValue())
                .unit(request.unit())
                .weightDeclared(request.weightDeclared().floatValue())
                .weightActual(request.weightActual().floatValue())
                .receptionDate(request.receptionDate())
                .expirationDate(request.expirationDate())
                .bestBefore(request.bestBefore())
                .status(request.status() != null ? request.status() : StockItem.StockStatus.AVAILABLE)
                .statusReason(request.statusReason())
                .receptionTemp(request.receptionTemp().floatValue())
                .build();

        stockItem = stockItemRepository.save(stockItem);
        return stockItemMapper.getDto(stockItem);
    }


    public StockItemDto getById(UUID id) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + id));
        return stockItemMapper.getDto(stockItem);
    }


    public Page<StockItemDto> list(Pageable pageable) {
        return stockItemRepository.findAll(pageable)
                .map(stockItemMapper::getDto);
    }


    public Page<StockItemDto> search(
            UUID productId,
            UUID cooperativeId,
            UUID locationId,
            StockItem.StockStatus status,
            String lotNumber,
            Pageable pageable) {

        return stockItemRepository.findWithFilters(productId, cooperativeId, locationId, status, lotNumber, pageable)
                .map(stockItemMapper::getDto);
    }

    public List<StockItemDto> findExpiringSoon(int daysAhead) {
        LocalDate limit = LocalDate.now().plusDays(daysAhead);
        return stockItemRepository.findExpiringBefore(limit).stream()
                .map(stockItemMapper::getDto).toList();
    }

    public List<StockItemDto> findLowStock(BigDecimal threshold) {
        return stockItemRepository.findLowStock(threshold).stream()
                .map(stockItemMapper::getDto)
                .toList();
    }



    @Transactional
    public StockItemDto update(UUID id, StockItemDto request) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + id));

        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + request.productId()));

        StorageLocation location = storageLocationRepository.findById(request.locationId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "StorageLocation not found: " + request.locationId()));

        Cooperative cooperative = cooperativeRepository.findById(request.cooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.cooperativeId()));

        stockItem.setProduct(product);
        stockItem.setLocation(location);
        stockItem.setCooperative(cooperative);
        stockItem.setLotNumber(request.lotNumber());
        stockItem.setQuantity(request.quantity().floatValue());
        stockItem.setUnit(request.unit());
        stockItem.setWeightDeclared(request.weightDeclared().floatValue());
        stockItem.setWeightActual(request.weightActual().floatValue());
        stockItem.setReceptionDate(request.receptionDate());
        stockItem.setExpirationDate(request.expirationDate());
        stockItem.setBestBefore(request.bestBefore());
        if (request.status() != null) stockItem.setStatus(request.status());
        stockItem.setStatusReason(request.statusReason());
        stockItem.setReceptionTemp(request.receptionTemp().floatValue());

        stockItem = stockItemRepository.save(stockItem);
        return stockItemMapper.getDto(stockItem);
    }

    @Transactional
    public StockItemDto updateStatus(UUID id, UpdateStatusRequest request) {
        StockItem stockItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + id));

        if (stockItem.getStatus() == StockItem.StockStatus.CONSUMED) {
            throw new IllegalArgumentException("Cannot change status of a consumed stock item");
        }

        stockItem.setStatus(request.getStatus());
        stockItem.setStatusReason(request.getReason());

        stockItem = stockItemRepository.save(stockItem);
        return stockItemMapper.getDto(stockItem);
    }



    @Transactional
    public void delete(UUID id) {
        if (!stockItemRepository.existsById(id)) {
            throw new IllegalArgumentException("StockItem not found: " + id);
        }
        stockItemRepository.deleteById(id);
    }
}