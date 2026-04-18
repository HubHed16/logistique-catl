package com.catl.wms.service;

import com.catl.wms.dto.storage.StorageLocationDto;
import com.catl.wms.model.StorageLocation;
import com.catl.wms.model.StorageZone;
import com.catl.wms.repository.StorageLocationRepository;
import com.catl.wms.repository.StorageZoneRepository;
import com.catl.wms.service.mapper.StorageLocationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageLocationService {

    private final StorageLocationRepository storageLocationRepository;
    private final StorageLocationMapper storageLocationMapper;

    private final StorageZoneRepository storageZoneRepository;

    public Page<StorageLocationDto> getAllstorageLocation(PageRequest pageRequest) {
        return storageLocationRepository.findAll(pageRequest).map(storageLocationMapper::getDto);
    }

    public Optional<StorageLocationDto> getStorageLocationById(UUID id) {
        return storageLocationRepository.findById(id).map(storageLocationMapper::getDto);
    }

    public List<StorageLocationDto> getStorageLocationsByZoneId(UUID zoneId) {
        return storageLocationRepository.findByZoneId(zoneId).stream()
                .map(storageLocationMapper::getDto)
                .toList();
    }

    public Optional<StorageLocationDto> getStorageLocationByLabel(String label) {
        return storageLocationRepository.findByLabel(label).stream()
                .findFirst()
                .map(storageLocationMapper::getDto);
    }

    public List<StorageLocationDto> getStorageLocationsByRack(String rack) {
        return storageLocationRepository.findByRack(rack).stream()
                .map(storageLocationMapper::getDto)
                .toList();
    }

    public StorageLocationDto saveOrUpdateStorageLocation(UUID storageLocationId, StorageLocationDto storageLocationDto) {
        StorageLocation storageLocation;
        if (storageLocationId == null) {
            storageLocation = new StorageLocation();
        } else {
            storageLocation = storageLocationRepository.findById(storageLocationId)
                    .orElseThrow(() -> new RuntimeException("Storage location not found with id: " + storageLocationId));
        }

        StorageZone storageZone = storageZoneRepository.findById(storageLocationDto.zoneId())
                .orElseThrow(() -> new RuntimeException("Producer not found with id: " + storageLocationDto.zoneId()));

        storageLocation.setLabel(storageLocationDto.label());
        storageLocation.setRack(storageLocationDto.rack());
        storageLocation.setPosition(storageLocationDto.position());
        storageLocation.setTemperature(Float.valueOf(storageLocationDto.temperature()));
        storageLocation.setZone(storageZone);
        return storageLocationMapper.getDto(storageLocationRepository.save(storageLocation));
    }

    public void deleteStorageLocation(UUID id) {
        if (!storageLocationRepository.existsById(id)) {
            throw new RuntimeException("Storage location not found with id: " + id);
        }
        storageLocationRepository.deleteById(id);
    }
}
