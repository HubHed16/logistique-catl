package com.catl.tour.service;

import com.catl.tour.api.model.Infrastructure;
import com.catl.tour.api.model.InfrastructureUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
class InfrastructureRepository {

    private final JdbcClient jdbc;

    InfrastructureRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = """
            id, producer_id, dry_surface_m2, fresh_surface_m2,
            frozen_surface_m2, prep_surface_m2, updated_at
            """;

    Optional<Infrastructure> findByProducer(UUID producerId) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM infrastructure WHERE producer_id = :producerId")
                .param("producerId", producerId)
                .query(this::mapRow)
                .optional();
    }

    void upsert(UUID producerId, InfrastructureUpdate input) {
        jdbc.sql("""
                INSERT INTO infrastructure (
                    producer_id, dry_surface_m2, fresh_surface_m2,
                    frozen_surface_m2, prep_surface_m2
                ) VALUES (
                    :producerId,
                    COALESCE(:dry, 0),
                    COALESCE(:fresh, 0),
                    COALESCE(:frozen, 0),
                    COALESCE(:prep, 0)
                )
                ON CONFLICT (producer_id) DO UPDATE SET
                    dry_surface_m2    = COALESCE(:dry, infrastructure.dry_surface_m2),
                    fresh_surface_m2  = COALESCE(:fresh, infrastructure.fresh_surface_m2),
                    frozen_surface_m2 = COALESCE(:frozen, infrastructure.frozen_surface_m2),
                    prep_surface_m2   = COALESCE(:prep, infrastructure.prep_surface_m2),
                    updated_at        = now()
                """)
                .param("producerId", producerId)
                .param("dry", input.getDrySurfaceM2())
                .param("fresh", input.getFreshSurfaceM2())
                .param("frozen", input.getFrozenSurfaceM2())
                .param("prep", input.getPrepSurfaceM2())
                .update();
    }

    private Infrastructure mapRow(ResultSet rs, int rowNum) throws SQLException {
        Infrastructure i = new Infrastructure();
        i.setId(rs.getObject("id", UUID.class));
        i.setProducerId(rs.getObject("producer_id", UUID.class));
        i.setDrySurfaceM2(rs.getInt("dry_surface_m2"));
        i.setFreshSurfaceM2(rs.getInt("fresh_surface_m2"));
        i.setFrozenSurfaceM2(rs.getInt("frozen_surface_m2"));
        i.setPrepSurfaceM2(rs.getInt("prep_surface_m2"));
        i.setUpdatedAt(rs.getObject("updated_at", OffsetDateTime.class));
        return i;
    }
}
