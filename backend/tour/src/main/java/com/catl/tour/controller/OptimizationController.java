package com.catl.tour.controller;

import com.catl.tour.api.OptimizationApi;
import com.catl.tour.api.model.OptimizationHubPickingList;
import com.catl.tour.api.model.OptimizationInput;
import com.catl.tour.api.model.OptimizationProducerHubTransfer;
import com.catl.tour.api.model.OptimizationResult;
import com.catl.tour.api.model.OptimizationStopAssignment;
import com.catl.tour.api.model.OptimizationTour;
import com.catl.tour.api.model.OptimizationTourLeg;
import com.catl.tour.api.model.OptimizationTourType;
import com.catl.tour.api.model.Waypoint;
import com.catl.tour.service.optimization.DailyRoutingOptimizer;
import com.catl.tour.service.optimization.HubPickingList;
import com.catl.tour.service.optimization.OptimizationRequest;
import com.catl.tour.service.optimization.ProducerHubTransfer;
import com.catl.tour.service.optimization.StopAssignment;
import com.catl.tour.service.optimization.TourLeg;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class OptimizationController implements OptimizationApi {

    private final DailyRoutingOptimizer optimizer;

    OptimizationController(DailyRoutingOptimizer optimizer) {
        this.optimizer = optimizer;
    }

    @Override
    public ResponseEntity<OptimizationResult> optimizeDailyRouting(OptimizationInput input) {
        OptimizationRequest request = new OptimizationRequest(
                input.getDate(),
                input.getHandlingFeePerUnit() != null ? input.getHandlingFeePerUnit() : 0.0,
                input.getOpeningFee() != null ? input.getOpeningFee() : 0.0,
                input.getMaxSolveTimeMs() != null ? input.getMaxSolveTimeMs() : 10_000L,
                input.getAvgSpeedKmPerHour() != null ? input.getAvgSpeedKmPerHour() : 50.0
        );

        var r = optimizer.optimize(request);

        OptimizationResult body = new OptimizationResult(
                r.date(),
                r.solverStatus(),
                r.stopCount(),
                r.producerCount(),
                r.baselineAllDirectCostEur(),
                r.optimizedCostEur(),
                r.savingsEur(),
                r.assignments().stream().map(this::toApiAssignment).toList(),
                r.transfers().stream().map(this::toApiTransfer).toList(),
                r.pickingLists().stream().map(this::toApiPickingList).toList()
        );
        body.setSolveTimeMs(r.solveTimeMs());
        body.setHubsAvailable(r.hubsAvailable());
        body.setHubsUsed(r.hubsUsed());
        body.setTours(r.tours().stream().map(this::toApiTour).toList());
        return ResponseEntity.ok(body);
    }

    private OptimizationTour toApiTour(com.catl.tour.service.optimization.OptimizationTour t) {
        OptimizationTour dto = new OptimizationTour();
        dto.setTourId(t.tourId());
        dto.setType(OptimizationTourType.valueOf(t.type().name()));
        dto.setProducerId(t.producerId());
        dto.setHubId(t.hubId());
        dto.setStart(toWp(t.start()));
        dto.setEnd(toWp(t.end()));
        dto.setOrderedStopIds(t.orderedStopIds());
        dto.setTotalKm(t.totalKm());
        dto.setTotalTravelCostEur(t.totalTravelCostEur());
        dto.setLegs(t.legs().stream().map(this::toApiLeg).toList());
        return dto;
    }

    private Waypoint toWp(com.catl.tour.service.optimization.GeoPoint p) {
        return new Waypoint().latitude(p.latitude()).longitude(p.longitude());
    }

    private OptimizationTourLeg toApiLeg(TourLeg l) {
        OptimizationTourLeg dto = new OptimizationTourLeg();
        dto.setFromStopId(l.fromStopId());
        dto.setToStopId(l.toStopId());
        dto.setFrom(toWp(l.from()));
        dto.setTo(toWp(l.to()));
        dto.setKm(l.km());
        dto.setTravelCostEur(l.travelCostEur());
        return dto;
    }

    private OptimizationStopAssignment toApiAssignment(StopAssignment a) {
        OptimizationStopAssignment dto = new OptimizationStopAssignment(
                a.stopId(),
                a.routeId(),
                a.producerId(),
                a.sequence(),
                OptimizationStopAssignment.ModeEnum.valueOf(a.mode().name()),
                a.volume(),
                a.directCostEur()
        );
        dto.latitude(a.latitude());
        dto.longitude(a.longitude());
        dto.setHubId(a.hubId());
        if (!Double.isNaN(a.viaHubCostEur())) {
            dto.setViaHubCostEur(a.viaHubCostEur());
        }
        return dto;
    }

    private OptimizationProducerHubTransfer toApiTransfer(ProducerHubTransfer t) {
        return new OptimizationProducerHubTransfer(
                t.producerId(),
                t.hubId(),
                t.detourKm(),
                t.detourCostEur(),
                t.totalVolume(),
                t.stopIds()
        );
    }

    private OptimizationHubPickingList toApiPickingList(HubPickingList p) {
        return new OptimizationHubPickingList(
                p.hubId(),
                p.location().latitude(),
                p.location().longitude(),
                p.stopIds(),
                p.contributingProducers(),
                p.totalVolume(),
                p.openingCostEur()
        );
    }
}
