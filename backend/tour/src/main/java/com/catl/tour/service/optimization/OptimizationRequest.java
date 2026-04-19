package com.catl.tour.service.optimization;

import java.time.LocalDate;

public record OptimizationRequest(
        LocalDate date,
        double handlingFeePerUnit,
        double openingFee,
        long maxSolveTimeMs,
        double avgSpeedKmPerHour
) {
    public static OptimizationRequest of(LocalDate date) {
        return new OptimizationRequest(date, 0.0, 0.0, 10_000L, 50.0);
    }
}
