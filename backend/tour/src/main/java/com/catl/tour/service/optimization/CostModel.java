package com.catl.tour.service.optimization;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
public class CostModel {

    private static final double DEFAULT_PRODUCER_COST_PER_KM = 0.60;

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

    /**
     * Coût d'un aller-retour sur une distance donnée, en tenant compte:
     * - Carburant: km * conso(L/100km) * prix(L)
     * - Chauffeur: temps(km/vitesse) * €/h
     */
    public double roundTripTravelCost(double oneWayKm, double volume, TravelCostParams params) {
        double roundTripKm = 2.0 * oneWayKm;

        double consLPer100 = params.consumptionLPer100KmForVolume(volume);
        double fuelCost = roundTripKm * (consLPer100 / 100.0) * params.fuelPriceEurPerL();

        double amortCost = roundTripKm * params.amortizationEurKm();

        double hours = roundTripKm / params.avgSpeedKmPerHour();
        double driverCost = hours * params.driverCostEurPerHour();

        return fuelCost + amortCost + driverCost;
    }

    public double directCost(
            GeoPoint depot,
            StopDemand stop,
            TravelCostParams params
    ) {
        double km = distance.km(depot.latitude(), depot.longitude(), stop.latitude(), stop.longitude());
        return roundTripTravelCost(km, stop.volume(), params);
    }

    public double hubAssignCost(
            GeoPoint hub,
            StopDemand stop,
            TravelCostParams params,
            double handlingFeePerUnit
    ) {
        double km = distance.km(hub.latitude(), hub.longitude(), stop.latitude(), stop.longitude());
        return roundTripTravelCost(km, stop.volume(), params)
             + handlingFeePerUnit * stop.volume();
    }

    /**
     * Trajet rajouté: transfert dépôt ↔ hub (aller-retour), payé une fois par (producer, hub) utilisé.
     */
    public double hubTransferCost(
            GeoPoint depot,
            GeoPoint hub,
            TravelCostParams params
    ) {
        double km = distance.km(depot.latitude(), depot.longitude(), hub.latitude(), hub.longitude());
        return roundTripTravelCost(km, 0.0, params);
    }
}
