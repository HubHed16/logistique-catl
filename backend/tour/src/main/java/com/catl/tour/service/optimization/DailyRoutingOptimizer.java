package com.catl.tour.service.optimization;

import com.catl.tour.exception.ApiException;
import com.google.ortools.linearsolver.MPConstraint;
import com.google.ortools.linearsolver.MPObjective;
import com.google.ortools.linearsolver.MPSolver;
import com.google.ortools.linearsolver.MPVariable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class DailyRoutingOptimizer {

    private static final String SOLVER_NAME = "CBC";

    private final HubRepository hubRepository;
    private final DailyDemandLoader demandLoader;
    private final CostModel costModel;
    private final DistanceProvider distance;

    DailyRoutingOptimizer(
            HubRepository hubRepository,
            DailyDemandLoader demandLoader,
            CostModel costModel,
            DistanceProvider distance
    ) {
        this.hubRepository = hubRepository;
        this.demandLoader = demandLoader;
        this.costModel = costModel;
        this.distance = distance;
    }

    public OptimizationResult optimize(OptimizationRequest request) {
        long startNanos = System.nanoTime();

        List<StopDemand> allStops = demandLoader.loadForDate(request.date());
        if (allStops.isEmpty()) {
            return emptyResult(request, 0, 0, startNanos, "NO_STOPS");
        }

        Set<UUID> producerIds = new LinkedHashSet<>();
        for (StopDemand s : allStops) producerIds.add(s.producerId());

        Map<UUID, GeoPoint> depots = hubRepository.findDepots(producerIds);
        List<StopDemand> stops = new ArrayList<>(allStops.size());
        for (StopDemand s : allStops) {
            if (depots.containsKey(s.producerId())) stops.add(s);
        }
        if (stops.isEmpty()) {
            return emptyResult(request, 0, 0, startNanos, "NO_PRODUCER_WITH_DEPOT");
        }

        Set<UUID> activeProducers = new LinkedHashSet<>();
        for (StopDemand s : stops) activeProducers.add(s.producerId());

        Map<UUID, Double> costPerKm = new HashMap<>();
        for (UUID pid : activeProducers) {
            costPerKm.put(pid, costModel.producerCostPerKm(pid));
        }
        double hubCostPerKm = costModel.hubCostPerKm();

        List<HubCandidate> hubs = hubRepository.findAll(
                request.handlingFeePerUnit(),
                request.openingFee()
        );

        if (hubs.isEmpty()) {
            return allDirectResult(request, stops, depots, costPerKm, 0, startNanos);
        }

        return solveMilp(request, stops, activeProducers, depots, costPerKm, hubs, hubCostPerKm, startNanos);
    }

    private OptimizationResult solveMilp(
            OptimizationRequest request,
            List<StopDemand> stops,
            Set<UUID> activeProducers,
            Map<UUID, GeoPoint> depots,
            Map<UUID, Double> costPerKm,
            List<HubCandidate> hubs,
            double hubCostPerKm,
            long startNanos
    ) {
        int n = stops.size();
        int m = hubs.size();

        List<UUID> producerList = new ArrayList<>(activeProducers);
        Map<UUID, Integer> producerIdx = new HashMap<>();
        for (int p = 0; p < producerList.size(); p++) producerIdx.put(producerList.get(p), p);
        int pCount = producerList.size();

        double[] directCost = new double[n];
        double[][] lastMileCost = new double[n][m];
        double[][] detourKm = new double[pCount][m];
        double[][] detourCost = new double[pCount][m];

        for (int i = 0; i < n; i++) {
            StopDemand s = stops.get(i);
            GeoPoint depot = depots.get(s.producerId());
            directCost[i] = costModel.directCost(depot, s, costPerKm.get(s.producerId()));
            for (int j = 0; j < m; j++) {
                lastMileCost[i][j] = costModel.hubAssignCost(
                        hubs.get(j).location(), s,
                        hubCostPerKm, hubs.get(j).handlingFeePerUnit()
                );
            }
        }
        for (int p = 0; p < pCount; p++) {
            UUID pid = producerList.get(p);
            GeoPoint depot = depots.get(pid);
            double pKm = costPerKm.get(pid);
            for (int j = 0; j < m; j++) {
                GeoPoint hub = hubs.get(j).location();
                double km = distance.km(depot, hub);
                detourKm[p][j] = 2.0 * km;
                detourCost[p][j] = 2.0 * km * pKm;
            }
        }

        MPSolver solver = MPSolver.createSolver(SOLVER_NAME);
        if (solver == null) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "SOLVER_UNAVAILABLE",
                    "Could not create MILP solver '" + SOLVER_NAME + "'"
            );
        }
        solver.setTimeLimit(request.maxSolveTimeMs());

        MPVariable[] xDirect = new MPVariable[n];
        MPVariable[][] xHub = new MPVariable[n][m];
        MPVariable[][] z = new MPVariable[pCount][m];
        MPVariable[] y = new MPVariable[m];

        for (int i = 0; i < n; i++) {
            xDirect[i] = solver.makeBoolVar("xd_" + i);
            for (int j = 0; j < m; j++) {
                xHub[i][j] = solver.makeBoolVar("xh_" + i + "_" + j);
            }
        }
        for (int p = 0; p < pCount; p++) {
            for (int j = 0; j < m; j++) {
                z[p][j] = solver.makeBoolVar("z_" + p + "_" + j);
            }
        }
        for (int j = 0; j < m; j++) {
            y[j] = solver.makeBoolVar("y_" + j);
        }

        for (int i = 0; i < n; i++) {
            MPConstraint c = solver.makeConstraint(1.0, 1.0, "assign_" + i);
            c.setCoefficient(xDirect[i], 1);
            for (int j = 0; j < m; j++) c.setCoefficient(xHub[i][j], 1);
        }

        for (int i = 0; i < n; i++) {
            int p = producerIdx.get(stops.get(i).producerId());
            for (int j = 0; j < m; j++) {
                MPConstraint link = solver.makeConstraint(
                        Double.NEGATIVE_INFINITY, 0.0, "link_s_" + i + "_" + j);
                link.setCoefficient(xHub[i][j], 1);
                link.setCoefficient(z[p][j], -1);
            }
        }

        for (int p = 0; p < pCount; p++) {
            for (int j = 0; j < m; j++) {
                MPConstraint link = solver.makeConstraint(
                        Double.NEGATIVE_INFINITY, 0.0, "link_z_" + p + "_" + j);
                link.setCoefficient(z[p][j], 1);
                link.setCoefficient(y[j], -1);
            }
        }

        MPObjective obj = solver.objective();
        for (int i = 0; i < n; i++) {
            obj.setCoefficient(xDirect[i], directCost[i]);
            for (int j = 0; j < m; j++) obj.setCoefficient(xHub[i][j], lastMileCost[i][j]);
        }
        for (int p = 0; p < pCount; p++) {
            for (int j = 0; j < m; j++) obj.setCoefficient(z[p][j], detourCost[p][j]);
        }
        for (int j = 0; j < m; j++) obj.setCoefficient(y[j], request.openingFee());
        obj.setMinimization();

        MPSolver.ResultStatus status = solver.solve();
        if (status != MPSolver.ResultStatus.OPTIMAL && status != MPSolver.ResultStatus.FEASIBLE) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "SOLVER_FAILED",
                    "MILP solver returned status: " + status
            );
        }

        List<StopAssignment> assignments = new ArrayList<>(n);
        double baseline = 0.0;
        int[] assignedHubOf = new int[n];

        for (int i = 0; i < n; i++) {
            baseline += directCost[i];
            int chosen = -1;
            for (int j = 0; j < m; j++) {
                if (xHub[i][j].solutionValue() > 0.5) { chosen = j; break; }
            }
            assignedHubOf[i] = chosen;
            StopDemand s = stops.get(i);
            if (chosen < 0) {
                assignments.add(new StopAssignment(
                        s.stopId(), s.routeId(), s.producerId(), s.sequence(),
                        StopAssignment.Mode.DIRECT, null, s.volume(),
                        directCost[i], Double.NaN, s.latitude(), s.longitude()
                ));
            } else {
                HubCandidate h = hubs.get(chosen);
                assignments.add(new StopAssignment(
                        s.stopId(), s.routeId(), s.producerId(), s.sequence(),
                        StopAssignment.Mode.VIA_HUB, h.infrastructureId(), s.volume(),
                        directCost[i], lastMileCost[i][chosen], s.latitude(), s.longitude()
                ));
            }
        }

        List<ProducerHubTransfer> transfers = new ArrayList<>();
        for (int p = 0; p < pCount; p++) {
            UUID pid = producerList.get(p);
            for (int j = 0; j < m; j++) {
                if (z[p][j].solutionValue() < 0.5) continue;
                HubCandidate h = hubs.get(j);
                List<UUID> stopIds = new ArrayList<>();
                double volume = 0.0;
                for (int i = 0; i < n; i++) {
                    if (assignedHubOf[i] == j && stops.get(i).producerId().equals(pid)) {
                        stopIds.add(stops.get(i).stopId());
                        volume += stops.get(i).volume();
                    }
                }
                transfers.add(new ProducerHubTransfer(
                        pid, h.infrastructureId(),
                        detourKm[p][j], detourCost[p][j],
                        volume, stopIds
                ));
            }
        }

        List<HubPickingList> pickingLists = new ArrayList<>();
        int hubsUsed = 0;
        for (int j = 0; j < m; j++) {
            if (y[j].solutionValue() < 0.5) continue;
            hubsUsed++;
            HubCandidate h = hubs.get(j);
            Map<UUID, Double> perProducer = new LinkedHashMap<>();
            List<UUID> stopIds = new ArrayList<>();
            double totalVolume = 0.0;
            for (int i = 0; i < n; i++) {
                if (assignedHubOf[i] != j) continue;
                StopDemand s = stops.get(i);
                stopIds.add(s.stopId());
                totalVolume += s.volume();
                perProducer.merge(s.producerId(), s.volume(), Double::sum);
            }
            pickingLists.add(new HubPickingList(
                    h.infrastructureId(), h.producerId(), h.location(),
                    stopIds, new ArrayList<>(perProducer.keySet()),
                    totalVolume, request.openingFee()
            ));
        }

        double optimized = obj.value();
        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;

        return new OptimizationResult(
                request.date(), status.name(), elapsedMs,
                n, pCount, m, hubsUsed,
                baseline, optimized, baseline - optimized,
                assignments, transfers, pickingLists
        );
    }

    private OptimizationResult emptyResult(
            OptimizationRequest request, int producers, int hubs, long startNanos, String reason
    ) {
        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
        return new OptimizationResult(
                request.date(), reason, elapsedMs,
                0, producers, hubs, 0,
                0.0, 0.0, 0.0,
                Collections.emptyList(), Collections.emptyList(), Collections.emptyList()
        );
    }

    private OptimizationResult allDirectResult(
            OptimizationRequest request,
            List<StopDemand> stops,
            Map<UUID, GeoPoint> depots,
            Map<UUID, Double> costPerKm,
            int hubsAvailable,
            long startNanos
    ) {
        List<StopAssignment> assignments = new ArrayList<>(stops.size());
        double total = 0.0;
        for (StopDemand s : stops) {
            double c = costModel.directCost(depots.get(s.producerId()), s, costPerKm.get(s.producerId()));
            total += c;
            assignments.add(new StopAssignment(
                    s.stopId(), s.routeId(), s.producerId(), s.sequence(),
                    StopAssignment.Mode.DIRECT, null, s.volume(),
                    c, Double.NaN, s.latitude(), s.longitude()
            ));
        }
        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
        Set<UUID> producers = new LinkedHashSet<>();
        for (StopDemand s : stops) producers.add(s.producerId());
        return new OptimizationResult(
                request.date(), "NO_HUBS_AVAILABLE", elapsedMs,
                stops.size(), producers.size(), hubsAvailable, 0,
                total, total, 0.0,
                assignments, Collections.emptyList(), Collections.emptyList()
        );
    }
}
