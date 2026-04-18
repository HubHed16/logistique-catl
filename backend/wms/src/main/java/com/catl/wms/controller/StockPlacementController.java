package com.catl.wms.controller;

import com.catl.wms.dto.placement.AvailableLocationResponse;
import com.catl.wms.dto.placement.ConfirmPlacementRequest;
import com.catl.wms.dto.placement.PlacementResponse;
import com.catl.wms.model.StorageZone;
import com.catl.wms.service.StockPlacementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stock-placement")
@RequiredArgsConstructor
public class StockPlacementController {

    private final StockPlacementService stockPlacementService;

    /**
     * POST /api/stock-placement/{stockItemId}/assign
     * Le WMS assigne automatiquement une location au StockItem.
     */
    @PostMapping("/{stockItemId}/assign")
    public ResponseEntity<PlacementResponse> assignLocation(
            @PathVariable UUID stockItemId,
            @RequestParam(required = false) UUID operatorId) {

        PlacementResponse response = stockPlacementService.assignLocation(stockItemId, operatorId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/stock-placement/{stockItemId}/confirm
     * Le préparateur confirme le dépôt physique sur le rack (scan).
     */
    @PostMapping("/{stockItemId}/confirm")
    public ResponseEntity<PlacementResponse> confirmPlacement(
            @PathVariable UUID stockItemId,
            @RequestBody(required = false) ConfirmPlacementRequest request) {

        UUID operatorId = request != null ? request.getOperatorId() : null;
        PlacementResponse response = stockPlacementService.confirmPlacement(stockItemId, operatorId);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/stock-placement/locations/available?zoneType=COLD
     * Liste les locations libres pour un type de zone.
     */
    @GetMapping("/locations/available")
    public ResponseEntity<List<AvailableLocationResponse>> getAvailableLocations(
            @RequestParam StorageZone.ZoneType zoneType) {

        return ResponseEntity.ok(stockPlacementService.getAvailableLocations(zoneType));
    }
}