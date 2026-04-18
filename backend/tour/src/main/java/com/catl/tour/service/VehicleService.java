package com.catl.tour.service;

import com.catl.tour.api.model.Vehicle;
import com.catl.tour.api.model.VehicleCreate;
import com.catl.tour.api.model.VehiclePage;
import com.catl.tour.api.model.VehicleUpdate;
import com.catl.tour.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class VehicleService {

    private final VehicleRepository repository;

    VehicleService(VehicleRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public VehiclePage list(UUID producerId, int limit, int offset) {
        long total = repository.countByProducer(producerId);
        VehiclePage page = new VehiclePage((int) total, limit, offset);
        page.setItems(repository.findByProducer(producerId, limit, offset));
        return page;
    }

    @Transactional(readOnly = true)
    public Vehicle get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Vehicle", id));
    }

    @Transactional
    public Vehicle create(VehicleCreate input) {
        UUID id = repository.insert(input);
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Vehicle", id));
    }

    @Transactional
    public Vehicle update(UUID id, VehicleUpdate input) {
        int rows = repository.update(id, input);
        if (rows == 0) {
            throw new NotFoundException("Vehicle", id);
        }
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Vehicle", id));
    }

    @Transactional
    public void delete(UUID id) {
        int rows = repository.softDelete(id);
        if (rows == 0) {
            throw new NotFoundException("Vehicle", id);
        }
    }
}
