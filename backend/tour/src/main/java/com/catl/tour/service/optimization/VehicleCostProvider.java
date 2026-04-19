package com.catl.tour.service.optimization;

import com.catl.tour.api.model.Vehicle;
import com.catl.tour.service.VehicleService;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VehicleCostProvider {

    private final VehicleService vehicleService;
    private final Map<UUID, VehicleCostSnapshot> cache = new ConcurrentHashMap<>();

    VehicleCostProvider(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    public TravelCostParams paramsForVehicle(UUID vehicleId, double avgSpeedKmPerHour) {
        if (vehicleId == null) {
            throw new IllegalArgumentException("vehicleId is required to compute costs");
        }
        if (avgSpeedKmPerHour <= 0) {
            throw new IllegalArgumentException("avgSpeedKmPerHour must be > 0");
        }

        VehicleCostSnapshot snap = cache.computeIfAbsent(vehicleId, this::load);

        // Vehicle ne fournit pas (encore) de capacité ni de conso dépendante de la charge.
        // => conso constante (empty == full), et capacity=1 (charge ratio neutre).
        return new TravelCostParams(
                snap.fuelPriceEurPerL,
                snap.consumptionLPer100Km,
                snap.consumptionLPer100Km,
                snap.driverCostEurPerHour,
                snap.amortizationEurKm,
                avgSpeedKmPerHour,
                1.0
        );
    }

    private VehicleCostSnapshot load(UUID vehicleId) {
        Vehicle v = vehicleService.get(vehicleId);

        Double consumption = v.getConsumptionL100Km();
        Double fuelPrice = v.getFuelPrice();
        Double hourly = v.getHourlyCost();
        Double amortization = v.getAmortizationEurKm();

        double effectiveConsumption = consumption != null && consumption > 0 ? consumption : 8.0;
        double effectiveFuelPrice = fuelPrice != null && fuelPrice > 0 ? fuelPrice : 1.80;
        double effectiveHourly = hourly != null && hourly > 0 ? hourly : 25.0;
        double effectiveAmortization = amortization != null && amortization >= 0 ? amortization : 0.25;

        return new VehicleCostSnapshot(effectiveFuelPrice, effectiveConsumption, effectiveHourly, effectiveAmortization);
    }

    private record VehicleCostSnapshot(
            double fuelPriceEurPerL,
            double consumptionLPer100Km,
            double driverCostEurPerHour,
            double amortizationEurKm
    ) {}
}
