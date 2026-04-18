package com.catl.tour.controller;

import com.catl.tour.api.StopApi;
import com.catl.tour.api.model.Stop;
import com.catl.tour.api.model.StopCreate;
import com.catl.tour.api.model.StopReorderRequest;
import com.catl.tour.api.model.StopUpdate;
import com.catl.tour.service.StopService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class StopController implements StopApi {

    private final StopService service;

    StopController(StopService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<Stop> createStop(UUID routeId, StopCreate stopCreate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(routeId, stopCreate));
    }

    @Override
    public ResponseEntity<Stop> updateStop(UUID routeId, UUID stopId, StopUpdate stopUpdate) {
        return ResponseEntity.ok(service.update(routeId, stopId, stopUpdate));
    }

    @Override
    public ResponseEntity<Void> deleteStop(UUID routeId, UUID stopId) {
        service.delete(routeId, stopId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<Stop>> reorderStops(UUID routeId, StopReorderRequest stopReorderRequest) {
        return ResponseEntity.ok(service.reorder(routeId, stopReorderRequest.getOrder()));
    }
}
