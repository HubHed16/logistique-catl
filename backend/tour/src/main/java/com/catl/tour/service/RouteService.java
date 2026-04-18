package com.catl.tour.service;

import com.catl.tour.api.model.DayOfWeek;
import com.catl.tour.api.model.Route;
import com.catl.tour.api.model.RouteCreate;
import com.catl.tour.api.model.RouteDetail;
import com.catl.tour.api.model.RoutePage;
import com.catl.tour.api.model.RouteStatus;
import com.catl.tour.api.model.RouteUpdate;
import com.catl.tour.api.model.Stop;
import com.catl.tour.api.model.StopCreate;
import com.catl.tour.exception.ApiException;
import com.catl.tour.exception.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class RouteService {

    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;

    RouteService(RouteRepository routeRepository, StopRepository stopRepository) {
        this.routeRepository = routeRepository;
        this.stopRepository = stopRepository;
    }

    @Transactional(readOnly = true)
    public RoutePage list(UUID producerId, DayOfWeek dayOfWeek, RouteStatus status,
                          LocalDate scheduledDate, int limit, int offset) {
        long total = routeRepository.count(producerId, dayOfWeek, status, scheduledDate);
        RoutePage page = new RoutePage((int) total, limit, offset);
        page.setItems(routeRepository.search(producerId, dayOfWeek, status, scheduledDate, limit, offset));
        return page;
    }

    @Transactional(readOnly = true)
    public RouteDetail getDetail(UUID id) {
        RouteDetail detail = routeRepository.findDetailById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
        detail.setStops(stopRepository.findByRoute(id));
        return detail;
    }

    @Transactional
    public Route create(RouteCreate input) {
        UUID id = routeRepository.insert(input);
        return routeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
    }

    @Transactional
    public Route update(UUID id, RouteUpdate input) {
        assertMutable(id);
        routeRepository.update(id, input);
        return routeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
    }

    // Règle métier : un trajet `validated` reste éditable tant qu'on n'est pas
    // le jour même (scheduled_date). `completed` et `cancelled` sont terminaux.
    void assertMutable(UUID id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
        String status = route.getStatus() != null ? route.getStatus().getValue() : null;
        if ("completed".equals(status) || "cancelled".equals(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROUTE_LOCKED",
                    "Route is %s and cannot be modified".formatted(status));
        }
        if ("validated".equals(status)) {
            LocalDate scheduled = route.getScheduledDate();
            if (scheduled != null && scheduled.equals(LocalDate.now())) {
                throw new ApiException(HttpStatus.CONFLICT, "ROUTE_LOCKED",
                        "Route is scheduled today and cannot be modified");
            }
        }
    }

    @Transactional
    public void delete(UUID id) {
        int rows = routeRepository.softDelete(id);
        if (rows == 0) {
            throw new NotFoundException("Route", id);
        }
    }

    @Transactional
    public Route duplicate(UUID id) {
        RouteDetail source = routeRepository.findDetailById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
        List<Stop> stops = stopRepository.findByRoute(id);

        RouteCreate copy = new RouteCreate(source.getProducerId(), source.getName() + " (copy)");
        copy.setVehicleId(source.getVehicleId());
        copy.setDayOfWeek(source.getDayOfWeek());
        copy.setScheduledDate(null);
        UUID newId = routeRepository.insert(copy);

        int seq = 1;
        for (Stop s : stops) {
            StopCreate sc = new StopCreate(s.getOperation());
            sc.setCustomerId(s.getCustomerId());
            sc.setAmountEur(s.getAmountEur());
            sc.setDurationMin(s.getDurationMin());
            sc.setLatitude(s.getLatitude());
            sc.setLongitude(s.getLongitude());
            sc.setAddress(s.getAddress());
            stopRepository.insert(newId, seq++, sc);
        }
        return routeRepository.findById(newId)
                .orElseThrow(() -> new NotFoundException("Route", newId));
    }

    @Transactional
    public Route validate(UUID id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
        String status = route.getStatus() != null ? route.getStatus().getValue() : null;
        if (!"draft".equals(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROUTE_NOT_DRAFT",
                    "Only draft routes can be validated (current status: %s)".formatted(status));
        }
        if (routeRepository.countStops(id) == 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ROUTE_EMPTY",
                    "Route has no stops");
        }
        if (route.getVehicleId() == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ROUTE_NO_VEHICLE",
                    "Route must have a vehicle before it can be validated");
        }
        routeRepository.setStatus(id, RouteStatus.VALIDATED);
        return routeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Route", id));
    }

    @Transactional
    public RouteDetail optimize(UUID id) {
        String status = routeRepository.currentStatus(id);
        if (status == null) {
            throw new NotFoundException("Route", id);
        }
        if (!"draft".equals(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROUTE_LOCKED",
                    "Only draft routes can be optimized");
        }
        List<Stop> stops = stopRepository.findByRoute(id);
        if (stops.size() <= 2) {
            return getDetail(id);
        }

        List<UUID> optimized = nearestNeighbor(stops);
        stopRepository.reorder(id, optimized);
        return getDetail(id);
    }

    private List<UUID> nearestNeighbor(List<Stop> stops) {
        List<Stop> remaining = new ArrayList<>(stops);
        List<UUID> order = new ArrayList<>(stops.size());
        Stop current = remaining.stream()
                .filter(s -> s.getLatitude() != null && s.getLongitude() != null)
                .findFirst()
                .orElse(remaining.get(0));
        order.add(current.getId());
        remaining.remove(current);

        while (!remaining.isEmpty()) {
            final Stop from = current;
            Stop next = remaining.stream()
                    .min(Comparator.comparingDouble(s -> distance(from, s)))
                    .orElseThrow();
            order.add(next.getId());
            remaining.remove(next);
            current = next;
        }

        // Make sure any stop without coordinates still ends up in the list in original order.
        Set<UUID> seen = new LinkedHashSet<>(order);
        for (Stop s : stops) {
            if (!seen.contains(s.getId())) {
                order.add(s.getId());
            }
        }
        return order;
    }

    private double distance(Stop a, Stop b) {
        if (a.getLatitude() == null || a.getLongitude() == null
                || b.getLatitude() == null || b.getLongitude() == null) {
            return Double.MAX_VALUE;
        }
        double dLat = a.getLatitude() - b.getLatitude();
        double dLon = a.getLongitude() - b.getLongitude();
        return dLat * dLat + dLon * dLon;
    }
}
