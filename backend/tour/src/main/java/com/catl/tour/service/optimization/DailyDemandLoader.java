package com.catl.tour.service.optimization;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
public class DailyDemandLoader {

    private final JdbcClient jdbc;

    DailyDemandLoader(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<StopDemand> loadForDate(LocalDate date) {
        return jdbc.sql("""
                SELECT
                    s.id            AS stop_id,
                    s.route_id      AS route_id,
                    r.producer_id   AS producer_id,
                    s.sequence      AS sequence,
                    COALESCE(s.latitude,  c.latitude)  AS latitude,
                    COALESCE(s.longitude, c.longitude) AS longitude,
                    COALESCE(SUM(si.quantity), 0)      AS volume
                FROM route r
                JOIN stop s            ON s.route_id = r.id
                LEFT JOIN stop_item si ON si.stop_id = s.id
                LEFT JOIN customer c   ON c.id       = s.customer_id
                WHERE r.scheduled_date = :date
                  AND r.deleted_at     IS NULL
                  AND s.operation      = 'delivery'
                GROUP BY s.id, s.route_id, r.producer_id, s.sequence, s.latitude, s.longitude, c.latitude, c.longitude
                HAVING COALESCE(s.latitude,  c.latitude)  IS NOT NULL
                   AND COALESCE(s.longitude, c.longitude) IS NOT NULL
                ORDER BY r.producer_id, s.route_id, s.sequence
                """)
                .param("date", date)
                .query(this::mapRow)
                .list();
    }

    private StopDemand mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new StopDemand(
                rs.getObject("stop_id", UUID.class),
                rs.getObject("route_id", UUID.class),
                rs.getObject("producer_id", UUID.class),
                rs.getInt("sequence"),
                rs.getBigDecimal("latitude").doubleValue(),
                rs.getBigDecimal("longitude").doubleValue(),
                rs.getBigDecimal("volume").doubleValue()
        );
    }
}
