package com.catl.tour.service.optimization;

import java.util.List;

public final class DistanceMatrix {

    private final double[][] km;
    private final int rows;
    private final int cols;

    private DistanceMatrix(double[][] km) {
        this.km = km;
        this.rows = km.length;
        this.cols = rows == 0 ? 0 : km[0].length;
    }

    public static DistanceMatrix compute(
            DistanceProvider provider,
            List<GeoPoint> sources,
            List<GeoPoint> targets
    ) {
        int r = sources.size();
        int c = targets.size();
        double[][] m = new double[r][c];
        for (int i = 0; i < r; i++) {
            GeoPoint s = sources.get(i);
            for (int j = 0; j < c; j++) {
                m[i][j] = provider.km(s, targets.get(j));
            }
        }
        return new DistanceMatrix(m);
    }

    public double km(int source, int target) {
        return km[source][target];
    }

    public int rows() {
        return rows;
    }

    public int cols() {
        return cols;
    }

    public double[][] raw() {
        return km;
    }
}
