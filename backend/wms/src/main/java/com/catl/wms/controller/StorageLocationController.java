package com.catl.wms.controller;

import com.catl.wms.dto.storage.StorageLocationDto;
import com.catl.wms.service.StorageLocationService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequestMapping("/api/storage-locations")
@RestController
@RequiredArgsConstructor
public class StorageLocationController {

    private final StorageLocationService storageLocationService;

    @GetMapping
    public ResponseEntity<List<StorageLocationDto>> getAllStorageLocations(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        PageRequest pageRequest = PageRequest.of(page, size);
        Page<StorageLocationDto> locations = storageLocationService.getAllstorageLocation(pageRequest);

        if (locations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(locations.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StorageLocationDto> getStorageLocationById(@PathVariable UUID id) {
        return storageLocationService.getStorageLocationById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<List<StorageLocationDto>> getByZone(@PathVariable UUID zoneId) {
        List<StorageLocationDto> locations = storageLocationService.getStorageLocationsByZoneId(zoneId);

        if (locations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(locations);
    }

    @GetMapping("/label/{label}")
    public ResponseEntity<StorageLocationDto> getByLabel(@PathVariable String label) {
        return storageLocationService.getStorageLocationByLabel(label)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/rack/{rack}")
    public ResponseEntity<List<StorageLocationDto>> getByRack(@PathVariable String rack) {
        List<StorageLocationDto> locations = storageLocationService.getStorageLocationsByRack(rack);

        if (locations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(locations);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<StorageLocationDto> patchStorageLocation(
            @PathVariable UUID id,
            @RequestBody StorageLocationDto dto) {

        StorageLocationDto result = storageLocationService.saveOrUpdateStorageLocation(id, dto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStorageLocation(@PathVariable UUID id) {
        storageLocationService.deleteStorageLocation(id);
        return ResponseEntity.noContent().build();
    }
}