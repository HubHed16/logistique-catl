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
import java.util.Optional;
import java.util.UUID;

@RequestMapping("/api/storage-locations")
@RestController
@RequiredArgsConstructor
public class StorageLocationController {
    
    private final StorageLocationService storageLocationService;
    
    
    @GetMapping("/getAllStorageLocation")
    public ResponseEntity<List<StorageLocationDto>> getAllstorageLocations(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        var pageRequest = PageRequest.of(page, size);
        Page<StorageLocationDto> storageLocation = storageLocationService.getAllstorageLocation(pageRequest);

        if (storageLocation.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(storageLocation.getContent());
    }

    @GetMapping("/getStorageLocationById")
    public ResponseEntity<Optional<StorageLocationDto>> getStorageLocationById(@RequestParam UUID id) {
        Optional<StorageLocationDto> storageLocation = storageLocationService.getStorageLocationById(id);
        if (storageLocation.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(storageLocation);
    }

    @GetMapping("/zone")
    public ResponseEntity<List<StorageLocationDto>> getStorageLocationsByZone(@RequestParam UUID zoneId) {
        List<StorageLocationDto> locations = storageLocationService.getStorageLocationsByZoneId(zoneId);
        if (locations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(locations);
    }

    @GetMapping("/label")
    public ResponseEntity<Optional<StorageLocationDto>> getStorageLocationByLabel(@RequestParam String label) {
        Optional<StorageLocationDto> location = storageLocationService.getStorageLocationByLabel(label);
        if (location.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(location);
    }

    @GetMapping("/rack")
    public ResponseEntity<List<StorageLocationDto>> getStorageLocationsByRack(@RequestParam String rack) {
        List<StorageLocationDto> locations = storageLocationService.getStorageLocationsByRack(rack);
        if (locations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(locations);
    }


    @PostMapping()
    public ResponseEntity<StorageLocationDto> saveOrUpdateStorageLocation(@RequestParam(required = false) UUID storageLocationId, @RequestBody StorageLocationDto storageLocationDto) {
        StorageLocationDto result = storageLocationService.saveOrUpdateStorageLocation(storageLocationId, storageLocationDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping()
    public ResponseEntity<Void> deleteStorageLocation(@RequestParam UUID id) {
        storageLocationService.deleteStorageLocation(id);
        return ResponseEntity.noContent().build();
    }
}
