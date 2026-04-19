package com.catl.tour.service;

import com.catl.tour.api.model.Infrastructure;
import com.catl.tour.api.model.InfrastructureCreate;
import com.catl.tour.api.model.InfrastructurePage;
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
    public InfrastructurePage list(Integer limit, Integer offset) {
        int l = limit != null ? limit : 50;
        int o = offset != null ? offset : 0;
        return repository.list(l, o);
    }

    @Transactional
    public Infrastructure create(InfrastructureCreate input) {
        UUID id = repository.create(input);
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Infrastructure", id));
    }

    @Transactional(readOnly = true)
    public Infrastructure get(UUID infrastructureId) {
        return repository.findById(infrastructureId)
                .orElseThrow(() -> new NotFoundException("Infrastructure", infrastructureId));
    }

    @Transactional
    public Infrastructure update(UUID infrastructureId, InfrastructureUpdate input) {
        repository.update(infrastructureId, input);
        return repository.findById(infrastructureId)
                .orElseThrow(() -> new NotFoundException("Infrastructure", infrastructureId));
    }

    @Transactional
    public void delete(UUID infrastructureId) {
        repository.delete(infrastructureId);
    }
}
