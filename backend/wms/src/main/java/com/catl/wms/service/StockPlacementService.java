package com.catl.wms.service;

import com.catl.wms.dto.placement.AvailableLocationResponse;
import com.catl.wms.dto.placement.PlacementResponse;
import com.catl.wms.model.*;
import com.catl.wms.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StockPlacementService {

    private final StockItemRepository stockItemRepository;
    private final StorageLocationRepository storageLocationRepository;


    @Transactional
    public PlacementResponse assignLocation(UUID stockItemId, UUID operatorId) {

        StockItem stockItem = stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + stockItemId));


        if (stockItem.getStatus() != StockItem.StockStatus.AVAILABLE) {
            throw new IllegalArgumentException(
                    "StockItem must be AVAILABLE to be placed. Current status: " + stockItem.getStatus());
        }


        if (stockItem.getLocation() != null) {
            throw new IllegalArgumentException(
                    "StockItem is already placed at location: " + stockItem.getLocation().getLabel());
        }


        StorageZone.ZoneType requiredZoneType = mapStorageTypeToZoneType(
                stockItem.getProduct().getStorageType());


        List<StorageLocation> available = storageLocationRepository
                .findAvailableByZoneType(requiredZoneType);

        if (available.isEmpty()) {
            throw new IllegalArgumentException(
                    "No available location in zone type: " + requiredZoneType);
        }

        StorageLocation assigned = available.get(0);
        stockItem.setLocation(assigned);
        stockItem = stockItemRepository.save(stockItem);

        return PlacementResponse.from(stockItem);
    }


    @Transactional
    public PlacementResponse confirmPlacement(UUID stockItemId, UUID operatorId) {

        StockItem stockItem = stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + stockItemId));

        if (stockItem.getLocation() == null) {
            throw new IllegalArgumentException(
                    "StockItem has no assigned location. Call /assign first.");
        }


        stockItem.setStatusReason("Placement confirmed at " + stockItem.getLocation().getLabel());
        stockItem = stockItemRepository.save(stockItem);

        return PlacementResponse.from(stockItem);
    }


    public List<AvailableLocationResponse> getAvailableLocations(StorageZone.ZoneType zoneType) {
        return storageLocationRepository.findAvailableByZoneType(zoneType)
                .stream()
                .map(AvailableLocationResponse::from)
                .toList();
    }

    private StorageZone.ZoneType mapStorageTypeToZoneType(String storageType) {
        if (storageType == null) return StorageZone.ZoneType.AMBIENT;

        return switch (storageType.toUpperCase()) {
            case "COLD", "FRAIS", "REFRIGERE" -> StorageZone.ZoneType.COLD;
            case "FROZEN", "CONGELE", "SURGELE" -> StorageZone.ZoneType.FROZEN;
            case "DRY", "SEC" -> StorageZone.ZoneType.DRY;
            default -> StorageZone.ZoneType.AMBIENT;
        };
    }
}