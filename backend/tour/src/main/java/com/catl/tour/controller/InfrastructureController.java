package com.catl.tour.controller;

import com.catl.tour.api.InfrastructureApi;
import com.catl.tour.api.model.Infrastructure;
import com.catl.tour.api.model.InfrastructureUpdate;
import com.catl.tour.service.InfrastructureService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class InfrastructureController implements InfrastructureApi {

    private final InfrastructureService service;

    InfrastructureController(InfrastructureService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<Infrastructure> getInfrastructure(UUID producerId) {
        return ResponseEntity.ok(service.get(producerId));
    }

    @Override
    public ResponseEntity<Infrastructure> upsertInfrastructure(UUID producerId, InfrastructureUpdate infrastructureUpdate) {
        return ResponseEntity.ok(service.upsert(producerId, infrastructureUpdate));
    }
}
