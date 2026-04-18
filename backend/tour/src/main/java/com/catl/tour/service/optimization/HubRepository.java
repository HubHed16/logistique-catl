package com.catl.tour.service.optimization;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Repository
class HubRepository {

    private final JdbcClient jdbc;

    HubRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Map<UUID, GeoPoint> findDepots(Set<UUID> producerIds) {
        if (producerIds.isEmpty()) return Map.of();
        Map<UUID, GeoPoint> out = new HashMap<>();
        jdbc.sql("""
                SELECT producer_id, depot_latitude, depot_longitude
                FROM infrastructure
                WHERE producer_id IN (:producerIds)
                  AND depot_latitude IS NOT NULL
                  AND depot_longitude IS NOT NULL
                """)
                .param("producerIds", producerIds)
                .query((rs, n) -> {
                    out.put(
                            rs.getObject("producer_id", UUID.class),
                            new GeoPoint(
                                    rs.getBigDecimal("depot_latitude").doubleValue(),
                                    rs.getBigDecimal("depot_longitude").doubleValue()
                            )
                    );
                    return null;
                })
                .list();
        return out;
    }

    List<HubCandidate> findAll(double handlingFeePerUnit, double openingFee) {
        return jdbc.sql("""
                SELECT id, producer_id, depot_latitude, depot_longitude
                FROM infrastructure
                WHERE depot_latitude IS NOT NULL
                  AND depot_longitude IS NOT NULL
                """)
                .query((rs, n) -> new HubCandidate(
                        rs.getObject("id", UUID.class),
                        rs.getObject("producer_id", UUID.class),
                        new GeoPoint(
                                rs.getBigDecimal("depot_latitude").doubleValue(),
                                rs.getBigDecimal("depot_longitude").doubleValue()
                        ),
                        handlingFeePerUnit,
                        openingFee
                ))
                .list();
    }
}
