package com.catl.tour.service;

import com.catl.tour.api.model.GlobalStats;
import com.catl.tour.api.model.RouteStats;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
class StatsRepository {

    private final JdbcClient jdbc;

    StatsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Optional<RouteStats> routeStats(UUID routeId) {
        return jdbc.sql("""
                SELECT r.id, r.distance_km, r.duration_min, r.total_cost, r.total_revenue,
                       r.profitability_ratio,
                       (SELECT COUNT(*) FROM stop WHERE route_id = r.id) AS stop_count
                FROM route r
                WHERE r.id = :routeId AND r.deleted_at IS NULL
                """)
                .param("routeId", routeId)
                .query(this::mapRouteStats)
                .optional();
    }

    GlobalStats globalStats(UUID producerId, LocalDate from, LocalDate to) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*) AS routes_count,
                       COALESCE(SUM(distance_km), 0)   AS total_distance,
                       COALESCE(SUM(duration_min), 0)  AS total_duration,
                       COALESCE(SUM(total_cost), 0)    AS total_cost,
                       COALESCE(SUM(total_revenue), 0) AS total_revenue,
                       AVG(profitability_ratio)        AS avg_ratio
                FROM route
                WHERE producer_id = :producerId AND deleted_at IS NULL
                """);
        if (from != null) sql.append(" AND scheduled_date >= :from");
        if (to != null) sql.append(" AND scheduled_date <= :to");

        var stmt = jdbc.sql(sql.toString()).param("producerId", producerId);
        if (from != null) stmt = stmt.param("from", from);
        if (to != null) stmt = stmt.param("to", to);

        return stmt.query(this::mapGlobalStats).single();
    }

    private RouteStats mapRouteStats(ResultSet rs, int rowNum) throws SQLException {
        RouteStats stats = new RouteStats();
        stats.setRouteId(rs.getObject("id", UUID.class));
        stats.setDistanceKm(toDouble(rs.getBigDecimal("distance_km")));
        stats.setDurationMin(rs.getObject("duration_min") == null ? null : rs.getInt("duration_min"));
        stats.setTotalCost(toDouble(rs.getBigDecimal("total_cost")));
        stats.setTotalRevenue(toDouble(rs.getBigDecimal("total_revenue")));
        stats.setProfitabilityRatio(toDouble(rs.getBigDecimal("profitability_ratio")));

        int stopCount = rs.getInt("stop_count");
        Double cost = stats.getTotalCost();
        Double distance = stats.getDistanceKm();
        Double revenue = stats.getTotalRevenue();
        stats.setCostPerStop(cost != null && stopCount > 0 ? cost / stopCount : null);
        stats.setRevenuePerKm(revenue != null && distance != null && distance > 0 ? revenue / distance : null);
        return stats;
    }

    private GlobalStats mapGlobalStats(ResultSet rs, int rowNum) throws SQLException {
        GlobalStats stats = new GlobalStats();
        stats.setRoutesCount(rs.getInt("routes_count"));
        stats.setTotalDistanceKm(toDouble(rs.getBigDecimal("total_distance")));
        stats.setTotalDurationMin(rs.getObject("total_duration") == null ? 0 : rs.getInt("total_duration"));
        stats.setTotalCost(toDouble(rs.getBigDecimal("total_cost")));
        stats.setTotalRevenue(toDouble(rs.getBigDecimal("total_revenue")));
        stats.setAverageRatio(toDouble(rs.getBigDecimal("avg_ratio")));
        return stats;
    }

    private Double toDouble(BigDecimal v) {
        return v == null ? null : v.doubleValue();
    }
}
