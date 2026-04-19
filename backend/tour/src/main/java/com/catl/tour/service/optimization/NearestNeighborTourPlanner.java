package com.catl.tour.service.optimization;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Planner très simple: construit un ordre de visite par heuristique nearest-neighbor.
 *
 * Objectif: fournir un "trajet entre les points" cohérent (dépôt -> ...stops... -> dépôt)
 * sans introduire une complexité VRP complète.
 */
@Component
public class NearestNeighborTourPlanner {

    public List<Integer> planOrder(DistanceMatrix matrix, int startIndex) {
        int n = matrix.cols();
        if (n == 0) return List.of();

        Set<Integer> remaining = new HashSet<>();
        for (int i = 0; i < n; i++) {
            if (i != startIndex) remaining.add(i);
        }

        List<Integer> order = new ArrayList<>(n);
        int current = startIndex;
        order.add(current);

        while (!remaining.isEmpty()) {
            int best = -1;
            double bestKm = Double.POSITIVE_INFINITY;
            for (int cand : remaining) {
                double km = matrix.km(current, cand);
                if (km < bestKm) {
                    bestKm = km;
                    best = cand;
                }
            }
            remaining.remove(best);
            current = best;
            order.add(current);
        }

        return order;
    }
}
