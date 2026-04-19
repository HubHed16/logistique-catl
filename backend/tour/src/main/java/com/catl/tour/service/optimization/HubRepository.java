package com.catl.tour.service.optimization;

import com.catl.tour.client.WmsClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
class HubRepository {

    private static final Logger log = LoggerFactory.getLogger(HubRepository.class);

    private final JdbcClient jdbc;
    private final WmsClient wmsClient;

    HubRepository(JdbcClient jdbc, WmsClient wmsClient) {
        this.jdbc = jdbc;
        this.wmsClient = wmsClient;
    }

    /**
     * Dépôt par producteur.
     *
     * IMPORTANT: le coût DIRECT est calculé depuis ce dépôt. On doit donc utiliser
     * les coordonnées réelles du producteur (table `producer` côté WMS), plutôt
     * qu'un dépôt global partagé.
     */
    java.util.Map<UUID, GeoPoint> findDepots(Set<UUID> producerIds) {
        return wmsClient.getProducerDepots(producerIds);
    }

    List<HubCandidate> findAll(double handlingFeePerUnit, double openingFee) {
        List<HubCandidate> result = jdbc.sql("""
                SELECT id, depot_latitude, depot_longitude
                FROM infrastructure
                WHERE depot_latitude IS NOT NULL
                  AND depot_longitude IS NOT NULL
                """)
                .query((rs, n) -> new HubCandidate(
                        rs.getObject("id", UUID.class),
                        null,
                        new GeoPoint(
                                rs.getBigDecimal("depot_latitude").doubleValue(),
                                rs.getBigDecimal("depot_longitude").doubleValue()
                        ),
                        handlingFeePerUnit,
                        openingFee
                ))
                .list();

        if (result.isEmpty()) {
            log.warn("No hub candidates found in infrastructure table — either no records exist or all records have null depot coordinates");
        } else {
            log.debug("Loaded {} hub candidate(s) from infrastructure table", result.size());
        }

        return result;
    }
}
