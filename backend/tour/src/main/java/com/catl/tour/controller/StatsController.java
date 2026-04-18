package com.catl.tour.controller;

import com.catl.tour.api.StatsApi;
import com.catl.tour.api.model.GlobalStats;
import com.catl.tour.api.model.RouteStats;
import com.catl.tour.service.StatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
public class StatsController implements StatsApi {

    private final StatsService service;

    StatsController(StatsService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<RouteStats> getRouteStats(UUID routeId) {
        return ResponseEntity.ok(service.routeStats(routeId));
    }

    @Override
    public ResponseEntity<GlobalStats> getGlobalStats(UUID producerId, LocalDate from, LocalDate to) {
        return ResponseEntity.ok(service.globalStats(producerId, from, to));
    }
}
