package com.catl.tour.service;

import com.catl.tour.api.model.Infrastructure;
import com.catl.tour.api.model.InfrastructureUpdate;
import com.catl.tour.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class InfrastructureService {

    private final InfrastructureRepository repository;

    InfrastructureService(InfrastructureRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Infrastructure get(UUID producerId) {
        return repository.findByProducer(producerId)
                .orElseThrow(() -> new NotFoundException("Infrastructure for producer", producerId));
    }

    @Transactional
    public Infrastructure upsert(UUID producerId, InfrastructureUpdate input) {
        repository.upsert(producerId, input);
        return repository.findByProducer(producerId)
                .orElseThrow(() -> new NotFoundException("Infrastructure for producer", producerId));
    }
}
