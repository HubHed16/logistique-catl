package com.catl.wms.controller;

import com.catl.wms.dto.reception.QualityControlRequest;
import com.catl.wms.dto.reception.ReceptionRequest;
import com.catl.wms.dto.reception.ReceptionResponse;
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

    @PostMapping
    public ResponseEntity<ReceptionResponse> receiveProduct(
            @Valid @RequestBody ReceptionRequest request) {

        ReceptionResponse response = receptionService.receiveProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/quality-control")
    public ResponseEntity<ReceptionResponse> qualityControl(
            @Valid @RequestBody QualityControlRequest request) {

        ReceptionResponse response = receptionService.qualityControl(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{stockItemId}/scan")
    public ResponseEntity<ReceptionResponse> scanReception(
            @PathVariable UUID stockItemId,
            @RequestParam(required = false) Float weightActual,
            @RequestParam(required = false) UUID operatorId) {

        ReceptionResponse response = receptionService.scanReception(stockItemId, weightActual, operatorId);
        return ResponseEntity.ok(response);
    }
}