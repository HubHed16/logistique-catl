package com.catl.tour.service.optimization;

import java.time.LocalDate;
import java.util.List;

public record OptimizationResult(
        LocalDate date,
        String solverStatus,
        long solveTimeMs,
        int stopCount,
        int producerCount,
        int hubsAvailable,
        int hubsUsed,
        double baselineAllDirectCostEur,
        double optimizedCostEur,
        double savingsEur,
        List<StopAssignment> assignments,
        List<ProducerHubTransfer> transfers,
        List<HubPickingList> pickingLists,
        List<OptimizationTour> tours
) {
}
