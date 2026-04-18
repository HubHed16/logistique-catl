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
import java.util.Optional;
import java.util.UUID;

@RequestMapping("/api/storage-zones")
@RestController
@RequiredArgsConstructor
@Tag(name = "Storage-zones", description = "API to manage storage zones")
public class StorageZoneController {

    private final StorageZoneService storageZoneService;

    @GetMapping("/getAllStorageZones")
    public ResponseEntity<List<StorageZoneDto>> getAllStorageZones(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        var pageRequest = PageRequest.of(page, size);
        Page<StorageZoneDto> storageZone = storageZoneService.getAllStorageZone(pageRequest);

        if (storageZone.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(storageZone.getContent());
    }

    @GetMapping("/getById")
    public ResponseEntity<Optional<StorageZoneDto>> getStorageZoneById(@RequestParam UUID id) {
        var storageZone = storageZoneService.getStorageZoneById(id);
        if (storageZone.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(storageZone);
    }

    @GetMapping("/getByType")
    public ResponseEntity<List<StorageZoneDto>> getStorageZoneByType(@RequestBody List<StorageZone.ZoneType> types) {
        var storageZone = storageZoneService.getStorageZoneByType(types);
        if (storageZone.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(storageZone);
    }

    @PostMapping()
    public ResponseEntity<StorageZoneDto> saveOrUpdateStorageZone(@RequestParam(required = false) UUID storageZoneId, @RequestBody StorageZoneDto storageZoneDto) {
        StorageZoneDto result = storageZoneService.saveOrUpdateStorageZone(storageZoneId, storageZoneDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping()
    public ResponseEntity<Void> deleteStorageZone(@RequestParam UUID storageZoneId){
        try{
            storageZoneService.deleteStorageZone(storageZoneId);
            return ResponseEntity.noContent().build();
        }catch (RuntimeException e){
            return ResponseEntity.notFound().build();
        }
    }
}
