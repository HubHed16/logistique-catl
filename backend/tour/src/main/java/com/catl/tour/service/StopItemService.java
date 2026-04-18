package com.catl.tour.service;

import com.catl.tour.api.model.StopItem;
import com.catl.tour.api.model.StopItemCreate;
import com.catl.tour.api.model.StopItemUpdate;
import com.catl.tour.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StopItemService {

    private final StopItemRepository repository;

    StopItemService(StopItemRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StopItem> list(UUID stopId) {
        return repository.findByStop(stopId);
    }

    @Transactional
    public StopItem create(UUID stopId, StopItemCreate input) {
        UUID id = repository.insert(stopId, input);
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("StopItem", id));
    }

    @Transactional
    public StopItem update(UUID stopId, UUID itemId, StopItemUpdate input) {
        StopItem existing = repository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("StopItem", itemId));
        if (!stopId.equals(existing.getStopId())) {
            throw new NotFoundException("StopItem", itemId);
        }
        repository.update(itemId, input);
        return repository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("StopItem", itemId));
    }

    @Transactional
    public void delete(UUID stopId, UUID itemId) {
        StopItem existing = repository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("StopItem", itemId));
        if (!stopId.equals(existing.getStopId())) {
            throw new NotFoundException("StopItem", itemId);
        }
        repository.delete(itemId);
    }
}
