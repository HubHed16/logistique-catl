package com.catl.tour.service.optimization;

/**
 * Paramètres nécessaires pour convertir distance/temps en coût.
 *
 * Dans la version actuelle, les champs proviennent directement du modèle Vehicle.
 * Comme Vehicle ne stocke pas (encore) une capacité ni une conso dépendante de la charge,
 * on laisse vehicleCapacityVolume à 1 et consumptionEmpty == consumptionFull.
 */
public record TravelCostParams(
        double fuelPriceEurPerL,
        double consumptionEmptyLPer100Km,
        double consumptionFullLPer100Km,
        double driverCostEurPerHour,
        double avgSpeedKmPerHour,
        double vehicleCapacityVolume
) {
    public TravelCostParams {
        if (fuelPriceEurPerL < 0) throw new IllegalArgumentException("fuelPriceEurPerL must be >= 0");
        if (consumptionEmptyLPer100Km < 0) throw new IllegalArgumentException("consumptionEmptyLPer100Km must be >= 0");
        if (consumptionFullLPer100Km < 0) throw new IllegalArgumentException("consumptionFullLPer100Km must be >= 0");
        if (driverCostEurPerHour < 0) throw new IllegalArgumentException("driverCostEurPerHour must be >= 0");
        if (avgSpeedKmPerHour <= 0) throw new IllegalArgumentException("avgSpeedKmPerHour must be > 0");
        if (vehicleCapacityVolume <= 0) throw new IllegalArgumentException("vehicleCapacityVolume must be > 0");
    }

    public double consumptionLPer100KmForVolume(double volume) {
        if (volume <= 0) return consumptionEmptyLPer100Km;
        double ratio = Math.min(1.0, volume / vehicleCapacityVolume);
        return consumptionEmptyLPer100Km + (consumptionFullLPer100Km - consumptionEmptyLPer100Km) * ratio;
    }
}

