package com.catl.wms.service;

import com.catl.wms.dto.storage.StorageZoneDto;
import com.catl.wms.model.StorageZone;
import com.catl.wms.repository.StorageZoneRepository;
import com.catl.wms.service.mapper.StorageZoneMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageZoneService {

    private final StorageZoneRepository storageZoneRepository;
    private final StorageZoneMapper storageZoneMapper;

    public Page<StorageZoneDto> getAllStorageZone(PageRequest pageRequest) {
        return storageZoneRepository.findAll(pageRequest).map(storageZoneMapper::getDto);
    }

    public Optional<StorageZoneDto> getStorageZoneById(UUID id) {
        return storageZoneRepository.findById(id).map(storageZoneMapper::getDto);
    }

    public List<StorageZoneDto> getStorageZoneByType(List<StorageZone.ZoneType> types) {
        return storageZoneRepository.findByTypeIn(types).stream().map(storageZoneMapper::getDto).toList();
    }

    public StorageZoneDto saveOrUpdateStorageZone(UUID storageZoneId, StorageZoneDto storageZoneDto) {
        StorageZone storageZone;
        if (storageZoneId == null) {
            storageZone = new StorageZone();
        } else {
            storageZone = storageZoneRepository.findById(storageZoneId)
                    .orElseThrow(() -> new RuntimeException("Storage zone not found with id: " + storageZoneId));
        }

        storageZone.setName(storageZoneDto.name());
        storageZone.setType(storageZoneDto.type());
        storageZone.setTargetTemp(storageZoneDto.targetTemp());
        storageZone.setTempMin(storageZoneDto.tempMin());
        storageZone.setTempMax(storageZoneDto.tempMax());

        StorageZone savedStorageZone = storageZoneRepository.save(storageZone);
        return storageZoneMapper.getDto(savedStorageZone);
    }

    public void deleteStorageZone(UUID storageZoneId) {
        var storageZone = storageZoneRepository.findById(storageZoneId)
                .orElseThrow(() -> new RuntimeException("Storage zone not found with id: " + storageZoneId));
        storageZoneRepository.delete(storageZone);
    }
}
