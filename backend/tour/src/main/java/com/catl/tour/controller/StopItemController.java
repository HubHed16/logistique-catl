package com.catl.tour.controller;

import com.catl.tour.api.StopItemApi;
import com.catl.tour.api.model.StopItem;
import com.catl.tour.api.model.StopItemCreate;
import com.catl.tour.api.model.StopItemUpdate;
import com.catl.tour.service.StopItemService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class StopItemController implements StopItemApi {

    private final StopItemService service;

    StopItemController(StopItemService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<List<StopItem>> listStopItems(UUID stopId) {
        return ResponseEntity.ok(service.list(stopId));
    }

    @Override
    public ResponseEntity<StopItem> createStopItem(UUID stopId, StopItemCreate stopItemCreate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(stopId, stopItemCreate));
    }

    @Override
    public ResponseEntity<StopItem> updateStopItem(UUID stopId, UUID itemId, StopItemUpdate stopItemUpdate) {
        return ResponseEntity.ok(service.update(stopId, itemId, stopItemUpdate));
    }

    @Override
    public ResponseEntity<Void> deleteStopItem(UUID stopId, UUID itemId) {
        service.delete(stopId, itemId);
        return ResponseEntity.noContent().build();
    }
}
