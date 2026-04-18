package com.catl.tour.service.optimization;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
public class CostModel {

    private static final double DEFAULT_PRODUCER_COST_PER_KM = 0.60;

    private static final double HUB_VEHICLE_CONSUMPTION_L_100KM = 8.0;
    private static final double HUB_VEHICLE_FUEL_PRICE_EUR_L = 1.80;
    private static final double HUB_COST_PER_KM =
            HUB_VEHICLE_CONSUMPTION_L_100KM * HUB_VEHICLE_FUEL_PRICE_EUR_L / 100.0;

    private final JdbcClient jdbc;
    private final DistanceProvider distance;

    CostModel(JdbcClient jdbc, DistanceProvider distance) {
        this.jdbc = jdbc;
        this.distance = distance;
    }

    public double producerCostPerKm(UUID producerId) {
        Optional<BigDecimal> result = jdbc.sql("""
                SELECT AVG(
                    COALESCE(fuel_price, 0) * COALESCE(consumption_l_100km, 0) / 100.0
                    + COALESCE(amortization_eur_km, 0)
                )
                FROM vehicle
                WHERE producer_id = :producerId
                  AND deleted_at IS NULL
                """)
                .param("producerId", producerId)
                .query(BigDecimal.class)
                .optional();

        return result.map(BigDecimal::doubleValue)
                .filter(v -> v > 0)
                .orElse(DEFAULT_PRODUCER_COST_PER_KM);
    }

    public double hubCostPerKm() {
        return HUB_COST_PER_KM;
    }

    public double directCost(
            GeoPoint depot,
            StopDemand stop,
            double producerCostPerKm
    ) {
        double km = distance.km(depot.latitude(), depot.longitude(), stop.latitude(), stop.longitude());
        return 2.0 * km * producerCostPerKm * stop.volume();
    }

    public double hubAssignCost(
            GeoPoint hub,
            StopDemand stop,
            double hubCostPerKm,
            double handlingFeePerUnit
    ) {
        double km = distance.km(hub.latitude(), hub.longitude(), stop.latitude(), stop.longitude());
        return 2.0 * km * hubCostPerKm * stop.volume()
             + handlingFeePerUnit * stop.volume();
    }

    public double hubFixedCost(
            GeoPoint depot,
            GeoPoint hub,
            double producerCostPerKm,
            double openingFee
    ) {
        double km = distance.km(depot.latitude(), depot.longitude(), hub.latitude(), hub.longitude());
        return 2.0 * km * producerCostPerKm + openingFee;
    }
}
