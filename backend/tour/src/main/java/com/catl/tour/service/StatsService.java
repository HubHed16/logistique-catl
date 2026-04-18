package com.catl.tour.service;

import com.catl.tour.api.model.GlobalStats;
import com.catl.tour.api.model.RouteStats;
import com.catl.tour.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class StatsService {

    private final StatsRepository repository;

    StatsService(StatsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public RouteStats routeStats(UUID routeId) {
        return repository.routeStats(routeId)
                .orElseThrow(() -> new NotFoundException("Route", routeId));
    }

    @Transactional(readOnly = true)
    public GlobalStats globalStats(UUID producerId, LocalDate from, LocalDate to) {
        return repository.globalStats(producerId, from, to);
    }
}
