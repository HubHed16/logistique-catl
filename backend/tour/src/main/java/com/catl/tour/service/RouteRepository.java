package com.catl.tour.service;

import com.catl.tour.api.model.DayOfWeek;
import com.catl.tour.api.model.Route;
import com.catl.tour.api.model.RouteCreate;
import com.catl.tour.api.model.RouteDetail;
import com.catl.tour.api.model.RouteStatus;
import com.catl.tour.api.model.RouteUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class RouteRepository {

    private final JdbcClient jdbc;

    RouteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = """
            id, producer_id, vehicle_id, name, day_of_week, scheduled_date,
            status, distance_km, duration_min, total_cost, total_revenue,
            profitability_ratio, created_at, updated_at
            """;

    List<Route> search(UUID producerId, DayOfWeek dayOfWeek, RouteStatus status,
                       LocalDate scheduledDate, int limit, int offset) {
        StringBuilder sql = new StringBuilder("SELECT ").append(SELECT_COLS)
                .append(" FROM route WHERE producer_id = :producerId AND deleted_at IS NULL");
        if (dayOfWeek != null) sql.append(" AND day_of_week = :dayOfWeek");
        if (status != null) sql.append(" AND status = :status");
        if (scheduledDate != null) sql.append(" AND scheduled_date = :scheduledDate");
        sql.append(" ORDER BY scheduled_date DESC NULLS LAST, name ASC LIMIT :limit OFFSET :offset");

        var stmt = jdbc.sql(sql.toString())
                .param("producerId", producerId)
                .param("limit", limit)
                .param("offset", offset);
        if (dayOfWeek != null) stmt = stmt.param("dayOfWeek", dayOfWeek.getValue());
        if (status != null) stmt = stmt.param("status", status.getValue());
        if (scheduledDate != null) stmt = stmt.param("scheduledDate", scheduledDate);
        return stmt.query((rs, n) -> mapRoute(rs)).list();
    }

    long count(UUID producerId, DayOfWeek dayOfWeek, RouteStatus status, LocalDate scheduledDate) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM route WHERE producer_id = :producerId AND deleted_at IS NULL");
        if (dayOfWeek != null) sql.append(" AND day_of_week = :dayOfWeek");
        if (status != null) sql.append(" AND status = :status");
        if (scheduledDate != null) sql.append(" AND scheduled_date = :scheduledDate");
        var stmt = jdbc.sql(sql.toString()).param("producerId", producerId);
        if (dayOfWeek != null) stmt = stmt.param("dayOfWeek", dayOfWeek.getValue());
        if (status != null) stmt = stmt.param("status", status.getValue());
        if (scheduledDate != null) stmt = stmt.param("scheduledDate", scheduledDate);
        return stmt.query(Long.class).single();
    }

    Optional<Route> findById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM route WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query((rs, n) -> mapRoute(rs))
                .optional();
    }

    Optional<RouteDetail> findDetailById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM route WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query((rs, n) -> mapDetail(rs))
                .optional();
    }

    String currentStatus(UUID id) {
        return jdbc.sql("SELECT status FROM route WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    UUID insert(RouteCreate input) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO route (
                    id, producer_id, vehicle_id, name, day_of_week, scheduled_date, status
                ) VALUES (
                    :id, :producerId, :vehicleId, :name, :dayOfWeek, :scheduledDate, 'draft'
                )
                """)
                .param("id", id)
                .param("producerId", input.getProducerId())
                .param("vehicleId", input.getVehicleId())
                .param("name", input.getName())
                .param("dayOfWeek", input.getDayOfWeek() != null ? input.getDayOfWeek().getValue() : null)
                .param("scheduledDate", input.getScheduledDate())
                .update();
        return id;
    }

    int update(UUID id, RouteUpdate input) {
        return jdbc.sql("""
                UPDATE route SET
                    name           = COALESCE(:name, name),
                    vehicle_id     = COALESCE(:vehicleId, vehicle_id),
                    day_of_week    = COALESCE(:dayOfWeek, day_of_week),
                    scheduled_date = COALESCE(:scheduledDate, scheduled_date)
                WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", id)
                .param("name", input.getName())
                .param("vehicleId", input.getVehicleId())
                .param("dayOfWeek", input.getDayOfWeek() != null ? input.getDayOfWeek().getValue() : null)
                .param("scheduledDate", input.getScheduledDate())
                .update();
    }

    int setStatus(UUID id, RouteStatus status) {
        return jdbc.sql("UPDATE route SET status = :status WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .param("status", status.getValue())
                .update();
    }

    int updateAggregates(UUID id, Double distanceKm, Integer durationMin,
                         Double totalCost, Double totalRevenue, Double profitabilityRatio) {
        return jdbc.sql("""
                UPDATE route SET
                    distance_km         = :distanceKm,
                    duration_min        = :durationMin,
                    total_cost          = :totalCost,
                    total_revenue       = :totalRevenue,
                    profitability_ratio = :profitabilityRatio
                WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", id)
                .param("distanceKm", distanceKm)
                .param("durationMin", durationMin)
                .param("totalCost", totalCost)
                .param("totalRevenue", totalRevenue)
                .param("profitabilityRatio", profitabilityRatio)
                .update();
    }

    int softDelete(UUID id) {
        return jdbc.sql("UPDATE route SET deleted_at = now() WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .update();
    }

    long countStops(UUID routeId) {
        return jdbc.sql("SELECT COUNT(*) FROM stop WHERE route_id = :routeId")
                .param("routeId", routeId)
                .query(Long.class)
                .single();
    }

    private Route mapRoute(ResultSet rs) throws SQLException {
        Route r = new Route();
        applyCommon(r, rs);
        return r;
    }

    private RouteDetail mapDetail(ResultSet rs) throws SQLException {
        RouteDetail r = new RouteDetail();
        r.setId(rs.getObject("id", UUID.class));
        r.setProducerId(rs.getObject("producer_id", UUID.class));
        r.setVehicleId(rs.getObject("vehicle_id", UUID.class));
        r.setName(rs.getString("name"));
        String day = rs.getString("day_of_week");
        r.setDayOfWeek(day == null ? null : DayOfWeek.fromValue(day));
        java.sql.Date sd = rs.getDate("scheduled_date");
        r.setScheduledDate(sd == null ? null : sd.toLocalDate());
        r.setStatus(RouteStatus.fromValue(rs.getString("status")));
        r.setDistanceKm(rs.getObject("distance_km") == null ? null : rs.getBigDecimal("distance_km").doubleValue());
        r.setDurationMin(rs.getObject("duration_min") == null ? null : rs.getInt("duration_min"));
        r.setTotalCost(rs.getObject("total_cost") == null ? null : rs.getBigDecimal("total_cost").doubleValue());
        r.setTotalRevenue(rs.getObject("total_revenue") == null ? null : rs.getBigDecimal("total_revenue").doubleValue());
        r.setProfitabilityRatio(rs.getObject("profitability_ratio") == null ? null : rs.getBigDecimal("profitability_ratio").doubleValue());
        r.setCreatedAt(rs.getObject("created_at", OffsetDateTime.class));
        r.setUpdatedAt(rs.getObject("updated_at", OffsetDateTime.class));
        r.setStops(new ArrayList<>());
        return r;
    }

    private void applyCommon(Route r, ResultSet rs) throws SQLException {
        r.setId(rs.getObject("id", UUID.class));
        r.setProducerId(rs.getObject("producer_id", UUID.class));
        r.setVehicleId(rs.getObject("vehicle_id", UUID.class));
        r.setName(rs.getString("name"));
        String day = rs.getString("day_of_week");
        r.setDayOfWeek(day == null ? null : DayOfWeek.fromValue(day));
        java.sql.Date sd = rs.getDate("scheduled_date");
        r.setScheduledDate(sd == null ? null : sd.toLocalDate());
        r.setStatus(RouteStatus.fromValue(rs.getString("status")));
        r.setDistanceKm(rs.getObject("distance_km") == null ? null : rs.getBigDecimal("distance_km").doubleValue());
        r.setDurationMin(rs.getObject("duration_min") == null ? null : rs.getInt("duration_min"));
        r.setTotalCost(rs.getObject("total_cost") == null ? null : rs.getBigDecimal("total_cost").doubleValue());
        r.setTotalRevenue(rs.getObject("total_revenue") == null ? null : rs.getBigDecimal("total_revenue").doubleValue());
        r.setProfitabilityRatio(rs.getObject("profitability_ratio") == null ? null : rs.getBigDecimal("profitability_ratio").doubleValue());
        r.setCreatedAt(rs.getObject("created_at", OffsetDateTime.class));
        r.setUpdatedAt(rs.getObject("updated_at", OffsetDateTime.class));
    }
}
