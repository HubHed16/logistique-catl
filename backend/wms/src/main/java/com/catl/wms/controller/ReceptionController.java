package com.catl.wms.controller;

import com.catl.wms.dto.reception.*;
import com.catl.wms.service.ReceptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/receptions")
@RequiredArgsConstructor
public class ReceptionController {

    private final ReceptionService receptionService;

    /**
     * POST /api/receptions
     * Réceptionne une livraison correspondant à un Order existant.
     * Crée un StockItem par OrderLine + mouvement IN.
     * Gère les écarts de quantité.
     */
    @PostMapping
    public ResponseEntity<ReceptionResponse> receiveOrder(
            @Valid @RequestBody ReceptionRequest request) {

        ReceptionResponse response = receptionService.receiveOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/receptions/quality-control
     * QC sur un StockItem déjà réceptionné.
     */
    @PostMapping("/quality-control")
    public ResponseEntity<ReceptionLineResponse> qualityControl(
            @Valid @RequestBody QualityControlRequest request) {

        ReceptionLineResponse response = receptionService.qualityControl(request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/receptions/{stockItemId}/scan
     * Scan de confirmation physique avec poids réel.
     */
    @PostMapping("/{stockItemId}/scan")
    public ResponseEntity<ReceptionLineResponse> scanReception(
            @PathVariable UUID stockItemId,
            @RequestParam(required = false) Float weightActual,
            @RequestParam(required = false) UUID operatorId) {

        ReceptionLineResponse response = receptionService.scanReception(stockItemId, weightActual, operatorId);
        return ResponseEntity.ok(response);
    }
}