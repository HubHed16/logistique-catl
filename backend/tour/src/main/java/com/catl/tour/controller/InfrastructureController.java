package com.catl.tour.controller;

import com.catl.tour.api.InfrastructureApi;
import com.catl.tour.api.model.Infrastructure;
import com.catl.tour.api.model.InfrastructureCreate;
import com.catl.tour.api.model.InfrastructurePage;
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
    public ResponseEntity<InfrastructurePage> listInfrastructures(Integer limit, Integer offset) {
        return ResponseEntity.ok(service.list(limit, offset));
    }

    @Override
    public ResponseEntity<Infrastructure> createInfrastructure(InfrastructureCreate infrastructureCreate) {
        return ResponseEntity.status(201).body(service.create(infrastructureCreate));
    }

    @Override
    public ResponseEntity<Infrastructure> getInfrastructure(UUID infrastructureId) {
        return ResponseEntity.ok(service.get(infrastructureId));
    }

    @Override
    public ResponseEntity<Infrastructure> updateInfrastructure(UUID infrastructureId, InfrastructureUpdate infrastructureUpdate) {
        return ResponseEntity.ok(service.update(infrastructureId, infrastructureUpdate));
    }

    @Override
    public ResponseEntity<Void> deleteInfrastructure(UUID infrastructureId) {
        service.delete(infrastructureId);
        return ResponseEntity.noContent().build();
    }
}
