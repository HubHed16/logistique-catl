package com.catl.tour.service;

import com.catl.tour.api.model.Stop;
import com.catl.tour.api.model.StopCreate;
import com.catl.tour.api.model.StopOperation;
import com.catl.tour.api.model.StopUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class StopRepository {

    private final JdbcClient jdbc;

    StopRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = """
            id, route_id, customer_id, sequence, operation, amount_eur,
            duration_min, distance_from_prev_km, latitude, longitude, address
            """;

    List<Stop> findByRoute(UUID routeId) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM stop WHERE route_id = :routeId ORDER BY sequence ASC")
                .param("routeId", routeId)
                .query(this::mapRow)
                .list();
    }

    Optional<Stop> findById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM stop WHERE id = :id")
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    int nextSequence(UUID routeId) {
        return jdbc.sql("SELECT COALESCE(MAX(sequence), 0) + 1 FROM stop WHERE route_id = :routeId")
                .param("routeId", routeId)
                .query(Integer.class)
                .single();
    }

    UUID insert(UUID routeId, int sequence, StopCreate input) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO stop (
                    id, route_id, customer_id, sequence, operation,
                    amount_eur, duration_min, latitude, longitude, address
                ) VALUES (
                    :id, :routeId, :customerId, :sequence, :operation,
                    :amountEur, :durationMin, :latitude, :longitude, :address
                )
                """)
                .param("id", id)
                .param("routeId", routeId)
                .param("customerId", input.getCustomerId())
                .param("sequence", sequence)
                .param("operation", input.getOperation().getValue())
                .param("amountEur", input.getAmountEur() != null ? input.getAmountEur() : 0.0)
                .param("durationMin", input.getDurationMin() != null ? input.getDurationMin() : 15)
                .param("latitude", input.getLatitude())
                .param("longitude", input.getLongitude())
                .param("address", input.getAddress())
                .update();
        return id;
    }

    int update(UUID id, StopUpdate input) {
        return jdbc.sql("""
                UPDATE stop SET
                    customer_id  = COALESCE(:customerId, customer_id),
                    operation    = COALESCE(:operation, operation),
                    amount_eur   = COALESCE(:amountEur, amount_eur),
                    duration_min = COALESCE(:durationMin, duration_min),
                    latitude     = COALESCE(:latitude, latitude),
                    longitude    = COALESCE(:longitude, longitude),
                    address      = COALESCE(:address, address)
                WHERE id = :id
                """)
                .param("id", id)
                .param("customerId", input.getCustomerId())
                .param("operation", input.getOperation() != null ? input.getOperation().getValue() : null)
                .param("amountEur", input.getAmountEur())
                .param("durationMin", input.getDurationMin())
                .param("latitude", input.getLatitude())
                .param("longitude", input.getLongitude())
                .param("address", input.getAddress())
                .update();
    }

    int delete(UUID id) {
        return jdbc.sql("DELETE FROM stop WHERE id = :id").param("id", id).update();
    }

    void renumberAfterDelete(UUID routeId) {
        jdbc.sql("""
                WITH ordered AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY sequence) AS rn
                    FROM stop WHERE route_id = :routeId
                )
                UPDATE stop s SET sequence = ordered.rn
                FROM ordered WHERE s.id = ordered.id
                """)
                .param("routeId", routeId)
                .update();
    }

    void reorder(UUID routeId, List<UUID> orderedStopIds) {
        int max = orderedStopIds.size();
        // Two-pass to avoid (route_id, sequence) unique clashes: shift by +max first, then renumber.
        for (int i = 0; i < max; i++) {
            jdbc.sql("UPDATE stop SET sequence = :seq WHERE id = :id AND route_id = :routeId")
                    .param("seq", max + i + 1)
                    .param("id", orderedStopIds.get(i))
                    .param("routeId", routeId)
                    .update();
        }
        for (int i = 0; i < max; i++) {
            jdbc.sql("UPDATE stop SET sequence = :seq WHERE id = :id AND route_id = :routeId")
                    .param("seq", i + 1)
                    .param("id", orderedStopIds.get(i))
                    .param("routeId", routeId)
                    .update();
        }
    }

    int deleteByRoute(UUID routeId) {
        return jdbc.sql("DELETE FROM stop WHERE route_id = :routeId")
                .param("routeId", routeId)
                .update();
    }

    private Stop mapRow(ResultSet rs, int rowNum) throws SQLException {
        Stop s = new Stop();
        s.setId(rs.getObject("id", UUID.class));
        s.setRouteId(rs.getObject("route_id", UUID.class));
        s.setCustomerId(rs.getObject("customer_id", UUID.class));
        s.setSequence(rs.getInt("sequence"));
        s.setOperation(StopOperation.fromValue(rs.getString("operation")));
        s.setAmountEur(rs.getObject("amount_eur") == null ? null : rs.getBigDecimal("amount_eur").doubleValue());
        s.setDurationMin(rs.getObject("duration_min") == null ? null : rs.getInt("duration_min"));
        s.setDistanceFromPrevKm(rs.getObject("distance_from_prev_km") == null ? null : rs.getBigDecimal("distance_from_prev_km").doubleValue());
        s.setLatitude(rs.getObject("latitude") == null ? null : rs.getBigDecimal("latitude").doubleValue());
        s.setLongitude(rs.getObject("longitude") == null ? null : rs.getBigDecimal("longitude").doubleValue());
        s.setAddress(rs.getString("address"));
        return s;
    }
}
