package com.catl.wms.controller;

import com.catl.wms.dto.storage.StorageZoneDto;
import com.catl.wms.model.StorageZone;
import com.catl.wms.service.StorageZoneService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequestMapping("/api/storage-zones")
@RestController
@RequiredArgsConstructor
@Tag(name = "Storage Zones", description = "API to manage storage zones")
public class StorageZoneController {

    private final StorageZoneService storageZoneService;

    @GetMapping
    public ResponseEntity<List<StorageZoneDto>> getAllStorageZones(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        PageRequest pageRequest = PageRequest.of(page, size);
        Page<StorageZoneDto> storageZones = storageZoneService.getAllStorageZone(pageRequest);

        if (storageZones.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(storageZones.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StorageZoneDto> getStorageZoneById(@PathVariable UUID id) {
        return storageZoneService.getStorageZoneById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/types")
    public ResponseEntity<List<StorageZoneDto>> getStorageZonesByType(
            @RequestParam List<StorageZone.ZoneType> types) {

        List<StorageZoneDto> storageZones = storageZoneService.getStorageZoneByType(types);

        if (storageZones.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(storageZones);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<StorageZoneDto> patchStorageZone(
            @PathVariable UUID id,
            @RequestBody StorageZoneDto storageZoneDto) {

        StorageZoneDto result = storageZoneService.saveOrUpdateStorageZone(id, storageZoneDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStorageZone(@PathVariable UUID id) {
        storageZoneService.deleteStorageZone(id);
        return ResponseEntity.noContent().build();
    }
}