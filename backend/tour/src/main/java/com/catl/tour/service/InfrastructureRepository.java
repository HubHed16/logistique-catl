package com.catl.tour.service;

import com.catl.tour.api.model.Infrastructure;
import com.catl.tour.api.model.InfrastructureCreate;
import com.catl.tour.api.model.InfrastructurePage;
import com.catl.tour.api.model.InfrastructureUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
class InfrastructureRepository {

    private final JdbcClient jdbc;

    InfrastructureRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = """
            id, dry_surface_m2, fresh_surface_m2,
            frozen_surface_m2, prep_surface_m2,
            depot_latitude, depot_longitude, updated_at
            """;

    InfrastructurePage list(int limit, int offset) {
        long total = jdbc.sql("SELECT COUNT(*) AS c FROM infrastructure")
                .query((rs, n) -> rs.getLong("c"))
                .single();

        List<Infrastructure> items = jdbc.sql(
                        "SELECT " + SELECT_COLS + " FROM infrastructure ORDER BY updated_at DESC NULLS LAST, id LIMIT :limit OFFSET :offset"
                )
                .param("limit", limit)
                .param("offset", offset)
                .query(this::mapRow)
                .list();

        InfrastructurePage page = new InfrastructurePage();
        page.setTotal((int) total);
        page.setLimit(limit);
        page.setOffset(offset);
        page.setItems(items);
        return page;
    }

    Optional<Infrastructure> findById(UUID infrastructureId) {
        return jdbc.sql("SELECT " + SELECT_COLS + " FROM infrastructure WHERE id = :infrastructureId")
                .paramSource(Map.of("infrastructureId", infrastructureId))
                .query(this::mapRow)
                .optional();
    }

    UUID create(InfrastructureCreate input) {
        return jdbc.sql("""
                INSERT INTO infrastructure (
                    id, dry_surface_m2, fresh_surface_m2,
                    frozen_surface_m2, prep_surface_m2,
                    depot_latitude, depot_longitude
                ) VALUES (
                    gen_random_uuid(),
                    COALESCE(:dry, 0), COALESCE(:fresh, 0),
                    COALESCE(:frozen, 0), COALESCE(:prep, 0),
                    :depotLat, :depotLon
                )
                RETURNING id
                """)
                .paramSource(Map.of(
                        "dry", input.getDrySurfaceM2(),
                        "fresh", input.getFreshSurfaceM2(),
                        "frozen", input.getFrozenSurfaceM2(),
                        "prep", input.getPrepSurfaceM2(),
                        "depotLat", input.getDepotLatitude(),
                        "depotLon", input.getDepotLongitude()
                ))
                .query((rs, n) -> rs.getObject("id", UUID.class))
                .single();
    }

    void update(UUID infrastructureId, InfrastructureUpdate input) {
        jdbc.sql("""
                UPDATE infrastructure SET
                    dry_surface_m2    = COALESCE(:dry, dry_surface_m2),
                    fresh_surface_m2  = COALESCE(:fresh, fresh_surface_m2),
                    frozen_surface_m2 = COALESCE(:frozen, frozen_surface_m2),
                    prep_surface_m2   = COALESCE(:prep, prep_surface_m2),
                    depot_latitude    = COALESCE(:depotLat, depot_latitude),
                    depot_longitude   = COALESCE(:depotLon, depot_longitude),
                    updated_at        = now()
                WHERE id = :infrastructureId
                """)
                .paramSource(Map.of(
                        "infrastructureId", infrastructureId,
                        "dry", input.getDrySurfaceM2(),
                        "fresh", input.getFreshSurfaceM2(),
                        "frozen", input.getFrozenSurfaceM2(),
                        "prep", input.getPrepSurfaceM2(),
                        "depotLat", input.getDepotLatitude(),
                        "depotLon", input.getDepotLongitude()
                ))
                .update();
    }

    void delete(UUID infrastructureId) {
        jdbc.sql("DELETE FROM infrastructure WHERE id = :infrastructureId")
                .paramSource(Map.of("infrastructureId", infrastructureId))
                .update();
    }

    private Infrastructure mapRow(ResultSet rs, int rowNum) throws SQLException {
        Infrastructure i = new Infrastructure();
        i.setId(rs.getObject("id", UUID.class));
        i.setDrySurfaceM2(rs.getInt("dry_surface_m2"));
        i.setFreshSurfaceM2(rs.getInt("fresh_surface_m2"));
        i.setFrozenSurfaceM2(rs.getInt("frozen_surface_m2"));
        i.setPrepSurfaceM2(rs.getInt("prep_surface_m2"));
        i.setDepotLatitude(rs.getObject("depot_latitude") == null ? null : rs.getBigDecimal("depot_latitude").doubleValue());
        i.setDepotLongitude(rs.getObject("depot_longitude") == null ? null : rs.getBigDecimal("depot_longitude").doubleValue());
        i.setUpdatedAt(rs.getObject("updated_at", OffsetDateTime.class));
        return i;
    }
}
