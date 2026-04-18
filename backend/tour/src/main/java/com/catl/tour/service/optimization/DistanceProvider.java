package com.catl.tour.service.optimization;

public interface DistanceProvider {

    double km(double lat1, double lon1, double lat2, double lon2);

    default double km(GeoPoint from, GeoPoint to) {
        return km(from.latitude(), from.longitude(), to.latitude(), to.longitude());
    }
}
