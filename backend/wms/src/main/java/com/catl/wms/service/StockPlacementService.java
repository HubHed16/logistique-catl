package com.catl.wms.service;

import com.catl.wms.dto.placement.AvailableLocationResponse;
import com.catl.wms.dto.placement.PlacementResponse;
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
public class StockPlacementService {

    private final StockItemRepository stockItemRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final StockMovementRepository stockMovementRepository;

    /**
     * Le WMS assigne automatiquement une StorageLocation libre au StockItem.
     * Logique : on mappe le storage_type du produit vers un ZoneType
     * et on prend la première location libre dans cette zone.
     */
    @Transactional
    public PlacementResponse assignLocation(UUID stockItemId, UUID operatorId) {

        StockItem stockItem = stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + stockItemId));

        // Vérification : le StockItem doit être AVAILABLE (QC OK)
        if (stockItem.getStatus() != StockItem.StockStatus.AVAILABLE) {
            throw new IllegalArgumentException(
                    "StockItem must be AVAILABLE to be placed. Current status: " + stockItem.getStatus());
        }

        // Déjà placé ?
        if (stockItem.getLocation() != null) {
            throw new IllegalArgumentException(
                    "StockItem is already placed at location: " + stockItem.getLocation().getLabel());
        }

        // Déterminer le type de zone selon le storage_type du produit
        StorageZone.ZoneType requiredZoneType = mapStorageTypeToZoneType(
                stockItem.getProduct().getStorageType());

        // Chercher une location libre
        List<StorageLocation> available = storageLocationRepository
                .findAvailableByZoneType(requiredZoneType);

        if (available.isEmpty()) {
            throw new IllegalArgumentException(
                    "No available location in zone type: " + requiredZoneType);
        }

        StorageLocation assigned = available.get(0);
        stockItem.setLocation(assigned);
        stockItem = stockItemRepository.save(stockItem);

        // Mouvement TRANSFER (du dock vers le rack)
        StockMovement movement = StockMovement.builder()
                .stockItem(stockItem)
                .type(StockMovement.MovementType.TRANSFER)
                .quantity(stockItem.getQuantity())
                .timestamp(LocalDateTime.now())
                .reason("Stock placement assigned to " + assigned.getLabel())
                .operatorId(operatorId)
                .build();

        movement = stockMovementRepository.save(movement);

        return PlacementResponse.from(stockItem, movement.getId());
    }

    /**
     * Le préparateur scanne pour confirmer qu'il a physiquement déposé
     * le produit sur le rack.
     */
    @Transactional
    public PlacementResponse confirmPlacement(UUID stockItemId, UUID operatorId) {

        StockItem stockItem = stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + stockItemId));

        if (stockItem.getLocation() == null) {
            throw new IllegalArgumentException(
                    "StockItem has no assigned location. Call /assign first.");
        }

        // Mouvement de confirmation scan
        StockMovement movement = StockMovement.builder()
                .stockItem(stockItem)
                .type(StockMovement.MovementType.TRANSFER)
                .quantity(stockItem.getQuantity())
                .timestamp(LocalDateTime.now())
                .reason("Placement confirmed by scan at " + stockItem.getLocation().getLabel())
                .operatorId(operatorId)
                .build();

        movement = stockMovementRepository.save(movement);
        return PlacementResponse.from(stockItem, movement.getId());
    }

    /**
     * Liste toutes les locations libres d'un type de zone donné.
     */
    public List<AvailableLocationResponse> getAvailableLocations(StorageZone.ZoneType zoneType) {
        return storageLocationRepository.findAvailableByZoneType(zoneType)
                .stream()
                .map(AvailableLocationResponse::from)
                .toList();
    }

    /**
     * Mapping entre le storage_type d'un produit (chaîne libre)
     * et le ZoneType (enum).
     */
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