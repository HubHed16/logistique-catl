package com.catl.tour.controller;

import com.catl.tour.api.RouteApi;
import com.catl.tour.api.model.DayOfWeek;
import com.catl.tour.api.model.Route;
import com.catl.tour.api.model.RouteCreate;
import com.catl.tour.api.model.RouteDetail;
import com.catl.tour.api.model.RoutePage;
import com.catl.tour.api.model.RouteStatus;
import com.catl.tour.api.model.RouteUpdate;
import com.catl.tour.service.RouteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
public class RouteController implements RouteApi {

    private final RouteService service;

    RouteController(RouteService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<RoutePage> listRoutes(UUID producerId, DayOfWeek dayOfWeek, RouteStatus status,
                                                LocalDate scheduledDate, Integer limit, Integer offset) {
        return ResponseEntity.ok(service.list(producerId, dayOfWeek, status, scheduledDate, limit, offset));
    }

    @Override
    public ResponseEntity<RouteDetail> getRoute(UUID routeId) {
        return ResponseEntity.ok(service.getDetail(routeId));
    }

    @Override
    public ResponseEntity<Route> createRoute(RouteCreate routeCreate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(routeCreate));
    }

    @Override
    public ResponseEntity<Route> updateRoute(UUID routeId, RouteUpdate routeUpdate) {
        return ResponseEntity.ok(service.update(routeId, routeUpdate));
    }

    @Override
    public ResponseEntity<Void> deleteRoute(UUID routeId) {
        service.delete(routeId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Route> duplicateRoute(UUID routeId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.duplicate(routeId));
    }

    @Override
    public ResponseEntity<Route> validateRoute(UUID routeId) {
        return ResponseEntity.ok(service.validate(routeId));
    }

    @Override
    public ResponseEntity<RouteDetail> optimizeRoute(UUID routeId) {
        return ResponseEntity.ok(service.optimize(routeId));
    }
}
