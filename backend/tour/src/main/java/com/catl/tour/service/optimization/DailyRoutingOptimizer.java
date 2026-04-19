package com.catl.tour.service.optimization;

import com.catl.tour.exception.ApiException;
import com.google.ortools.linearsolver.MPConstraint;
import com.google.ortools.linearsolver.MPObjective;
import com.google.ortools.linearsolver.MPSolver;
import com.google.ortools.linearsolver.MPVariable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(DailyRoutingOptimizer.class);
    private static final String SOLVER_NAME = "CBC";

    private final HubRepository hubRepository;
    private final DailyDemandLoader demandLoader;
    private final CostModel costModel;
    private final DistanceProvider distance;
    private final VehicleCostProvider vehicleCostProvider;
    private final NearestNeighborTourPlanner tourPlanner;

    DailyRoutingOptimizer(
            HubRepository hubRepository,
            DailyDemandLoader demandLoader,
            CostModel costModel,
            DistanceProvider distance,
            VehicleCostProvider vehicleCostProvider,
            NearestNeighborTourPlanner tourPlanner
    ) {
        this.hubRepository = hubRepository;
        this.demandLoader = demandLoader;
        this.costModel = costModel;
        this.distance = distance;
        this.vehicleCostProvider = vehicleCostProvider;
        this.tourPlanner = tourPlanner;
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

        Set<UUID> missingDepot = new LinkedHashSet<>(producerIds);
        missingDepot.removeAll(depots.keySet());
        if (!missingDepot.isEmpty()) {
            log.warn("Producers excluded from optimization (no depot coords in WMS): {}", missingDepot);
        }

        List<StopDemand> stops = new ArrayList<>(allStops.size());
        for (StopDemand s : allStops) {
            if (depots.containsKey(s.producerId())) stops.add(s);
        }
        if (stops.isEmpty()) {
            return emptyResult(request, 0, 0, startNanos, "NO_PRODUCER_WITH_DEPOT");
        }

        Set<UUID> activeProducers = new LinkedHashSet<>();
        for (StopDemand s : stops) activeProducers.add(s.producerId());

        // Conservé (peut servir à debug/comparaison)
        Map<UUID, Double> costPerKm = new HashMap<>();
        for (UUID pid : activeProducers) {
            costPerKm.put(pid, costModel.producerCostPerKm(pid));
        }

        List<HubCandidate> hubs = hubRepository.findAll(
                request.handlingFeePerUnit(),
                request.openingFee()
        );

        if (hubs.isEmpty()) {
            log.warn("No hub candidates found (infrastructure table has no records with non-null depot_latitude/depot_longitude) — falling back to all-direct routing");
            return allDirectResult(request, stops, depots, costPerKm, 0, startNanos);
        }

        return solveMilp(request, stops, activeProducers, depots, costPerKm, hubs, startNanos);
    }

    private OptimizationResult solveMilp(
            OptimizationRequest request,
            List<StopDemand> stops,
            Set<UUID> activeProducers,
            Map<UUID, GeoPoint> depots,
            Map<UUID, Double> costPerKm,
            List<HubCandidate> hubs,
            long startNanos
    ) {
        int n = stops.size();
        int m = hubs.size();

        double avgSpeedKmPerHour = request.avgSpeedKmPerHour();

        List<UUID> producerList = new ArrayList<>(activeProducers);
        Map<UUID, Integer> producerIdx = new HashMap<>();
        for (int p = 0; p < producerList.size(); p++) producerIdx.put(producerList.get(p), p);
        int pCount = producerList.size();

        // Coûts utilisés par le MILP.
        // IMPORTANT: on ne veut plus un AR par stop, mais une approximation "tournée".
        double[] directCost = new double[n];
        double[][] lastMileCost = new double[n][m];
        double[][] detourKm = new double[pCount][m];
        double[][] detourCost = new double[pCount][m];

        // 1) Pré-calcul: facteur de mutualisation par route (direct) basé sur un chaînage nearest-neighbor.
        //    On calcule la distance totale de la route (dépot -> stops -> dépot) / somme des AR individuels.
        //    Puis on applique ce facteur aux coûts "par stop" pour approximer un coût tourné.
        Map<UUID, Double> routeDirectScale = computeRouteDirectScale(stops, depots, avgSpeedKmPerHour);

        for (int i = 0; i < n; i++) {
            StopDemand s = stops.get(i);
            GeoPoint depot = depots.get(s.producerId());
            TravelCostParams stopParams = vehicleCostProvider.paramsForVehicle(s.vehicleId(), avgSpeedKmPerHour);

            double baseDirect = costModel.directCost(depot, s, stopParams);
            double scale = routeDirectScale.getOrDefault(s.routeId(), 1.0);
            directCost[i] = baseDirect * scale;
            // lastMileCost[i][j] est calculé après (avec mutualisation hub-route), pas ici.
        }

        // 2) Mutualisation last-mile: scale GLOBALE par hub (tous producteurs confondus).
        //    On simule une tournée NN depuis le hub couvrant TOUS les stops: si deux producteurs
        //    ont des stops dans le même secteur, un seul véhicule peut les livrer ensemble,
        //    ce qui est le bénéfice central du hub. Une scale par routeId manquerait ce gain.
        Map<UUID, Double> globalHubScale = computeGlobalHubScale(stops, hubs);
        for (int i = 0; i < n; i++) {
            StopDemand s = stops.get(i);
            TravelCostParams stopParams = vehicleCostProvider.paramsForVehicle(s.vehicleId(), avgSpeedKmPerHour);
            for (int j = 0; j < m; j++) {
                double base = costModel.hubAssignCost(hubs.get(j).location(), s, stopParams, hubs.get(j).handlingFeePerUnit());
                double scale = globalHubScale.getOrDefault(hubs.get(j).infrastructureId(), 1.0);
                lastMileCost[i][j] = base * scale;
            }
        }

        for (int p = 0; p < pCount; p++) {
            UUID pid = producerList.get(p);
            GeoPoint depot = depots.get(pid);

            UUID producerVehicleId = null;
            for (StopDemand s : stops) {
                if (s.producerId().equals(pid) && s.vehicleId() != null) {
                    producerVehicleId = s.vehicleId();
                    break;
                }
            }
            TravelCostParams producerParams;
            if (producerVehicleId == null) {
                log.warn("No vehicle found for producer {} — using default cost parameters (8 L/100km, 1.80 €/L, 25 €/h)", pid);
                producerParams = new TravelCostParams(1.80, 8.0, 8.0, 25.0, avgSpeedKmPerHour, 1.0);
            } else {
                producerParams = vehicleCostProvider.paramsForVehicle(producerVehicleId, avgSpeedKmPerHour);
            }

            for (int j = 0; j < m; j++) {
                GeoPoint hub = hubs.get(j).location();
                double km = distance.km(depot, hub);
                detourKm[p][j] = 2.0 * km;
                detourCost[p][j] = costModel.hubTransferCost(depot, hub, producerParams);
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

        // Un hub ne vaut la peine que si au moins 2 producteurs distincts y mutualisent.
        // Sans cette contrainte, le solveur peut ouvrir un hub avec 1 seul producteur,
        // ce qui n'apporte aucune mutualisation et ajoute juste un détour.
        for (int j = 0; j < m; j++) {
            MPConstraint minProd = solver.makeConstraint(0.0, Double.POSITIVE_INFINITY, "min_producers_" + j);
            for (int p = 0; p < pCount; p++) minProd.setCoefficient(z[p][j], 1);
            minProd.setCoefficient(y[j], -2);
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
                    h.infrastructureId(), h.location(),
                    stopIds, new ArrayList<>(perProducer.keySet()),
                    totalVolume, request.openingFee()
            ));
        }

        // Inclure les hubs candidats non retenus (stopIds vides) pour que le front puisse les afficher.
        for (int j = 0; j < m; j++) {
            if (y[j].solutionValue() >= 0.5) continue;
            HubCandidate h = hubs.get(j);
            pickingLists.add(new HubPickingList(
                    h.infrastructureId(), h.location(),
                    Collections.emptyList(), Collections.emptyList(),
                    0.0, request.openingFee()
            ));
        }

        double optimized = obj.value();
        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;

        // Étape A: reconstruction de tournées (boucles) pour traçage front.
        List<OptimizationTour> tours = buildTours(request, stops, depots, assignments, transfers, pickingLists, hubs);

        return new OptimizationResult(
                request.date(), status.name(), elapsedMs,
                n, pCount, m, hubsUsed,
                baseline, optimized, baseline - optimized,
                assignments, transfers, pickingLists,
                tours
        );
    }

    private List<OptimizationTour> buildTours(
            OptimizationRequest request,
            List<StopDemand> allStops,
            Map<UUID, GeoPoint> depots,
            List<StopAssignment> assignments,
            List<ProducerHubTransfer> transfers,
            List<HubPickingList> pickingLists,
            List<HubCandidate> hubs
    ) {
        // Indexer demandes par stopId pour récupérer vehicleId, coords, volume.
        Map<UUID, StopDemand> demandByStop = new HashMap<>();
        for (StopDemand d : allStops) demandByStop.put(d.stopId(), d);

        // Indexer hubs par id pour récupérer coords.
        Map<UUID, GeoPoint> hubLoc = new HashMap<>();
        for (HubCandidate h : hubs) hubLoc.put(h.infrastructureId(), h.location());

        List<OptimizationTour> out = new ArrayList<>();

        // (1) Tournées DIRECT: groupées par routeId.
        Map<UUID, List<StopDemand>> directByRoute = new LinkedHashMap<>();
        for (StopAssignment a : assignments) {
            if (a.mode() != StopAssignment.Mode.DIRECT) continue;
            StopDemand d = demandByStop.get(a.stopId());
            if (d == null) continue;
            directByRoute.computeIfAbsent(a.routeId(), _k -> new ArrayList<>()).add(d);
        }

        for (var e : directByRoute.entrySet()) {
            UUID routeId = e.getKey();
            List<StopDemand> routeStops = e.getValue();
            if (routeStops.isEmpty()) continue;

            UUID producerId = routeStops.get(0).producerId();
            GeoPoint depot = depots.get(producerId);
            if (depot == null) continue;

            UUID vehicleId = routeStops.get(0).vehicleId();
            if (vehicleId == null) continue;
            TravelCostParams params = vehicleCostProvider.paramsForVehicle(vehicleId, request.avgSpeedKmPerHour());

            TourBuildResult tr = buildLoop(depot, depot, routeStops, params);
            out.add(new OptimizationTour(
                    "direct-" + routeId,
                    OptimizationTourType.DIRECT,
                    producerId,
                    null,
                    depot,
                    depot,
                    tr.orderedStopIds,
                    tr.legs,
                    tr.totalKm,
                    tr.totalCost
            ));
        }

        // (2) Tournées BULK_TRANSFER: une boucle dépôt producteur -> hub -> dépôt pour chaque transfert non nul.
        for (ProducerHubTransfer t : transfers) {
            if (t.totalVolume() <= 0) continue;
            GeoPoint depot = depots.get(t.producerId());
            GeoPoint hub = hubLoc.get(t.hubId());
            if (depot == null || hub == null) continue;

            // vehicle: prendre le premier stop de ce producteur (on a besoin des params coût)
            UUID vehicleId = null;
            for (StopDemand d : allStops) {
                if (t.producerId().equals(d.producerId()) && d.vehicleId() != null) {
                    vehicleId = d.vehicleId();
                    break;
                }
            }
            if (vehicleId == null) continue;
            TravelCostParams params = vehicleCostProvider.paramsForVehicle(vehicleId, request.avgSpeedKmPerHour());

            // Legs: depot -> hub, hub -> depot
            double km1 = distance.km(depot, hub);
            double c1 = costModel.roundTripTravelCost(km1, 0.0, params) / 2.0;
            double km2 = distance.km(hub, depot);
            double c2 = costModel.roundTripTravelCost(km2, 0.0, params) / 2.0;

            List<TourLeg> legs = List.of(
                    new TourLeg(null, null, depot, hub, km1, c1),
                    new TourLeg(null, null, hub, depot, km2, c2)
            );

            out.add(new OptimizationTour(
                    "bulk-" + t.producerId() + "-" + t.hubId(),
                    OptimizationTourType.BULK_TRANSFER,
                    t.producerId(),
                    t.hubId(),
                    depot,
                    depot,
                    List.of(),
                    legs,
                    km1 + km2,
                    c1 + c2
            ));
        }

        // (3) Tournées LAST_MILE: une boucle par pickingList actif (hub -> stops -> hub).
        for (HubPickingList p : pickingLists) {
            if (p.stopIds().isEmpty()) continue;
            GeoPoint hub = hubLoc.get(p.hubId());
            if (hub == null) continue;

            List<StopDemand> hubStops = new ArrayList<>();
            for (UUID stopId : p.stopIds()) {
                StopDemand d = demandByStop.get(stopId);
                if (d == null) continue;
                hubStops.add(d);
            }
            if (hubStops.isEmpty()) continue;

            // vehicle: heuristique simple -> prendre le véhicule du premier stop.
            UUID vehicleId = hubStops.get(0).vehicleId();
            if (vehicleId == null) continue;
            TravelCostParams params = vehicleCostProvider.paramsForVehicle(vehicleId, request.avgSpeedKmPerHour());

            TourBuildResult tr = buildLoop(hub, hub, hubStops, params);
            out.add(new OptimizationTour(
                    "lm-" + p.hubId(),
                    OptimizationTourType.LAST_MILE,
                    null,
                    p.hubId(),
                    hub,
                    hub,
                    tr.orderedStopIds,
                    tr.legs,
                    tr.totalKm,
                    tr.totalCost
            ));
        }

        return out;
    }

    private record TourBuildResult(
            List<UUID> orderedStopIds,
            List<TourLeg> legs,
            double totalKm,
            double totalCost
    ) {}

    private TourBuildResult buildLoop(
            GeoPoint start,
            GeoPoint end,
            List<StopDemand> stops,
            TravelCostParams params
    ) {
        if (stops == null || stops.isEmpty()) {
            return new TourBuildResult(List.of(), List.of(), 0.0, 0.0);
        }

        // Construire points des stops
        List<GeoPoint> pts = new ArrayList<>(stops.size());
        for (StopDemand s : stops) pts.add(new GeoPoint(s.latitude(), s.longitude()));
        DistanceMatrix dm = DistanceMatrix.compute(distance, pts, pts);

        // Choisir point de départ = stop le plus proche du start
        int startIndex = 0;
        double bestKm = Double.POSITIVE_INFINITY;
        for (int i = 0; i < pts.size(); i++) {
            double km = distance.km(start, pts.get(i));
            if (km < bestKm) {
                bestKm = km;
                startIndex = i;
            }
        }

        List<Integer> orderIdx = tourPlanner.planOrder(dm, startIndex);

        List<StopDemand> orderedStops = new ArrayList<>(stops.size());
        for (int idx : orderIdx) orderedStops.add(stops.get(idx));

        List<UUID> orderedStopIds = orderedStops.stream().map(StopDemand::stopId).toList();

        List<TourLeg> legs = new ArrayList<>();
        double totalKm = 0.0;
        double totalCost = 0.0;

        GeoPoint prev = start;
        UUID prevStopId = null;
        for (StopDemand s : orderedStops) {
            GeoPoint next = new GeoPoint(s.latitude(), s.longitude());
            double km = distance.km(prev, next);
            double cost = costModel.roundTripTravelCost(km, s.volume(), params) / 2.0;
            legs.add(new TourLeg(prevStopId, s.stopId(), prev, next, km, cost));
            totalKm += km;
            totalCost += cost;
            prev = next;
            prevStopId = s.stopId();
        }

        // Retour/end
        double km = distance.km(prev, end);
        double cost = costModel.roundTripTravelCost(km, 0.0, params) / 2.0;
        legs.add(new TourLeg(prevStopId, null, prev, end, km, cost));
        totalKm += km;
        totalCost += cost;

        return new TourBuildResult(orderedStopIds, legs, totalKm, totalCost);
    }

    private OptimizationResult emptyResult(
            OptimizationRequest request, int producers, int hubs, long startNanos, String reason
    ) {
        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
        return new OptimizationResult(
                request.date(), reason, elapsedMs,
                0, producers, hubs, 0,
                0.0, 0.0, 0.0,
                Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
                List.of()
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
        double avgSpeedKmPerHour = request.avgSpeedKmPerHour();

        List<StopAssignment> assignments = new ArrayList<>(stops.size());
        double total = 0.0;
        for (StopDemand s : stops) {
            TravelCostParams stopParams = vehicleCostProvider.paramsForVehicle(s.vehicleId(), avgSpeedKmPerHour);
            double c = costModel.directCost(depots.get(s.producerId()), s, stopParams);
            total += c;
            assignments.add(new StopAssignment(
                    s.stopId(), s.routeId(), s.producerId(), s.sequence(),
                    StopAssignment.Mode.DIRECT, null, s.volume(),
                    c, Double.NaN, s.latitude(), s.longitude()
            ));
        }

        List<OptimizationTour> tours = buildTours(
                request, stops, depots, assignments,
                Collections.emptyList(), Collections.emptyList(), Collections.emptyList()
        );

        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
        Set<UUID> producers = new LinkedHashSet<>();
        for (StopDemand s : stops) producers.add(s.producerId());
        return new OptimizationResult(
                request.date(), "NO_HUBS_AVAILABLE", elapsedMs,
                stops.size(), producers.size(), hubsAvailable, 0,
                total, total, 0.0,
                assignments, Collections.emptyList(), Collections.emptyList(),
                tours
        );
    }

    private Map<UUID, Double> computeRouteDirectScale(
            List<StopDemand> stops,
            Map<UUID, GeoPoint> depots,
            double avgSpeedKmPerHour
    ) {
        // Grouper stops par route.
        Map<UUID, List<StopDemand>> byRoute = new LinkedHashMap<>();
        for (StopDemand s : stops) {
            byRoute.computeIfAbsent(s.routeId(), _k -> new ArrayList<>()).add(s);
        }

        Map<UUID, Double> out = new HashMap<>();
        for (var e : byRoute.entrySet()) {
            UUID routeId = e.getKey();
            List<StopDemand> routeStops = e.getValue();
            if (routeStops.size() < 2) {
                out.put(routeId, 1.0);
                continue;
            }

            UUID producerId = routeStops.get(0).producerId();
            GeoPoint depot = depots.get(producerId);
            if (depot == null) {
                out.put(routeId, 1.0);
                continue;
            }

            // ordre NN sur les stops de la route
            List<GeoPoint> pts = new ArrayList<>(routeStops.size());
            for (StopDemand s : routeStops) pts.add(new GeoPoint(s.latitude(), s.longitude()));
            DistanceMatrix dm = DistanceMatrix.compute(distance, pts, pts);

            int startIndex = 0;
            double bestDepotKm = Double.POSITIVE_INFINITY;
            for (int i = 0; i < pts.size(); i++) {
                double km = distance.km(depot, pts.get(i));
                if (km < bestDepotKm) {
                    bestDepotKm = km;
                    startIndex = i;
                }
            }

            List<Integer> orderIdx = tourPlanner.planOrder(dm, startIndex);

            // km tournée = depot->first + chain + last->depot
            GeoPoint prev = depot;
            double tourKm = 0.0;
            for (int idx : orderIdx) {
                GeoPoint next = pts.get(idx);
                tourKm += distance.km(prev, next);
                prev = next;
            }
            tourKm += distance.km(prev, depot);

            // km baseline = somme des AR depot<->stop
            double baselineKm = 0.0;
            for (GeoPoint p : pts) baselineKm += 2.0 * distance.km(depot, p);

            double scale = (baselineKm > 0) ? (tourKm / baselineKm) : 1.0;
            // Borne: éviter de trop "casser" le MILP.
            scale = Math.max(0.35, Math.min(1.0, scale));
            out.put(routeId, scale);
        }
        return out;
    }

    /**
     * Facteur de mutualisation last-mile par hub, calculé sur l'ensemble des stops
     * (tous producteurs confondus).
     *
     * Principe: on simule une tournée NN depuis le hub couvrant tous les stops potentiels,
     * puis on compare au coût naïf (AR individuel hub↔stop pour chaque stop).
     * Ce ratio reflète le gain de consolider plusieurs producteurs en une seule tournée last-mile.
     *
     * Scale ∈ [0.25, 1.0] — plus il y a de stops proches les uns des autres, plus le scale
     * est bas, et plus le hub devient attractif dans le MILP.
     */
    private Map<UUID, Double> computeGlobalHubScale(
            List<StopDemand> stops,
            List<HubCandidate> hubs
    ) {
        if (stops.size() < 2) {
            Map<UUID, Double> trivial = new HashMap<>();
            for (HubCandidate h : hubs) trivial.put(h.infrastructureId(), 1.0);
            return trivial;
        }

        List<GeoPoint> pts = new ArrayList<>(stops.size());
        for (StopDemand s : stops) pts.add(new GeoPoint(s.latitude(), s.longitude()));
        DistanceMatrix dm = DistanceMatrix.compute(distance, pts, pts);

        Map<UUID, Double> out = new HashMap<>();
        for (HubCandidate h : hubs) {
            GeoPoint hub = h.location();

            int startIndex = 0;
            double bestKm = Double.POSITIVE_INFINITY;
            for (int i = 0; i < pts.size(); i++) {
                double km = distance.km(hub, pts.get(i));
                if (km < bestKm) { bestKm = km; startIndex = i; }
            }

            List<Integer> orderIdx = tourPlanner.planOrder(dm, startIndex);

            GeoPoint prev = hub;
            double tourKm = 0.0;
            for (int idx : orderIdx) {
                GeoPoint next = pts.get(idx);
                tourKm += distance.km(prev, next);
                prev = next;
            }
            tourKm += distance.km(prev, hub);

            double baselineKm = 0.0;
            for (GeoPoint p : pts) baselineKm += 2.0 * distance.km(hub, p);

            double scale = (baselineKm > 0) ? (tourKm / baselineKm) : 1.0;
            scale = Math.max(0.25, Math.min(1.0, scale));
            out.put(h.infrastructureId(), scale);
        }
        return out;
    }
}
