package com.catl.tour.controller;

import com.catl.tour.api.VehicleApi;
import com.catl.tour.api.model.Vehicle;
import com.catl.tour.api.model.VehicleCreate;
import com.catl.tour.api.model.VehiclePage;
import com.catl.tour.api.model.VehicleUpdate;
import com.catl.tour.service.VehicleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class VehicleController implements VehicleApi {

    private final VehicleService service;

    VehicleController(VehicleService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<VehiclePage> listVehicles(UUID producerId, Integer limit, Integer offset) {
        return ResponseEntity.ok(service.list(producerId, limit, offset));
    }

    @Override
    public ResponseEntity<Vehicle> getVehicle(UUID vehicleId) {
        return ResponseEntity.ok(service.get(vehicleId));
    }

    @Override
    public ResponseEntity<Vehicle> createVehicle(VehicleCreate vehicleCreate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(vehicleCreate));
    }

    @Override
    public ResponseEntity<Vehicle> updateVehicle(UUID vehicleId, VehicleUpdate vehicleUpdate) {
        return ResponseEntity.ok(service.update(vehicleId, vehicleUpdate));
    }

    @Override
    public ResponseEntity<Void> deleteVehicle(UUID vehicleId) {
        service.delete(vehicleId);
        return ResponseEntity.noContent().build();
    }
}
