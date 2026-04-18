package com.catl.tour.service;

import com.catl.tour.api.model.Stop;
import com.catl.tour.api.model.StopCreate;
import com.catl.tour.api.model.StopUpdate;
import com.catl.tour.exception.ApiException;
import com.catl.tour.exception.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class StopService {

    private final StopRepository stopRepository;
    private final RouteRepository routeRepository;

    StopService(StopRepository stopRepository, RouteRepository routeRepository) {
        this.stopRepository = stopRepository;
        this.routeRepository = routeRepository;
    }

    @Transactional
    public Stop create(UUID routeId, StopCreate input) {
        assertRouteMutable(routeId);
        int seq = stopRepository.nextSequence(routeId);
        UUID id = stopRepository.insert(routeId, seq, input);
        return stopRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Stop", id));
    }

    @Transactional
    public Stop update(UUID routeId, UUID stopId, StopUpdate input) {
        assertRouteMutable(routeId);
        Stop existing = stopRepository.findById(stopId)
                .orElseThrow(() -> new NotFoundException("Stop", stopId));
        if (!routeId.equals(existing.getRouteId())) {
            throw new NotFoundException("Stop", stopId);
        }
        stopRepository.update(stopId, input);
        return stopRepository.findById(stopId)
                .orElseThrow(() -> new NotFoundException("Stop", stopId));
    }

    @Transactional
    public void delete(UUID routeId, UUID stopId) {
        assertRouteMutable(routeId);
        Stop existing = stopRepository.findById(stopId)
                .orElseThrow(() -> new NotFoundException("Stop", stopId));
        if (!routeId.equals(existing.getRouteId())) {
            throw new NotFoundException("Stop", stopId);
        }
        stopRepository.delete(stopId);
        stopRepository.renumberAfterDelete(routeId);
    }

    @Transactional
    public List<Stop> reorder(UUID routeId, List<UUID> orderedIds) {
        assertRouteMutable(routeId);
        List<Stop> current = stopRepository.findByRoute(routeId);
        Set<UUID> currentIds = new HashSet<>();
        for (Stop s : current) currentIds.add(s.getId());
        if (orderedIds.size() != currentIds.size() || !currentIds.equals(new HashSet<>(orderedIds))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REORDER_MISMATCH",
                    "Reorder payload must contain each stop of the route exactly once");
        }
        stopRepository.reorder(routeId, orderedIds);
        return stopRepository.findByRoute(routeId);
    }

    private void assertRouteMutable(UUID routeId) {
        String status = routeRepository.currentStatus(routeId);
        if (status == null) {
            throw new NotFoundException("Route", routeId);
        }
        if ("validated".equals(status) || "completed".equals(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROUTE_LOCKED",
                    "Route is %s and cannot be modified".formatted(status));
        }
    }
}
