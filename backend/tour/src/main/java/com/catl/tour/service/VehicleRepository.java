package com.catl.tour.service;

import com.catl.tour.api.model.DriverType;
import com.catl.tour.api.model.FuelType;
import com.catl.tour.api.model.Vehicle;
import com.catl.tour.api.model.VehicleCreate;
import com.catl.tour.api.model.VehicleType;
import com.catl.tour.api.model.VehicleUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class VehicleRepository {

    private final JdbcClient jdbc;

    VehicleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = """
            id, producer_id, type, fuel, consumption_l_100km, fuel_price,
            amortization_eur_km, refrigerated, driver_type, hourly_cost,
            prep_time_min, loading_time_min, created_at, updated_at
            """;

    List<Vehicle> findByProducer(UUID producerId, int limit, int offset) {
        return jdbc.sql("SELECT " + SELECT_COLS + """
                FROM vehicle
                WHERE producer_id = :producerId AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
                """)
                .param("producerId", producerId)
                .param("limit", limit)
                .param("offset", offset)
                .query(this::mapRow)
                .list();
    }

    long countByProducer(UUID producerId) {
        return jdbc.sql("SELECT COUNT(*) FROM vehicle WHERE producer_id = :producerId AND deleted_at IS NULL")
                .param("producerId", producerId)
                .query(Long.class)
                .single();
    }

    Optional<Vehicle> findById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM vehicle WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    UUID insert(VehicleCreate input) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO vehicle (
                    id, producer_id, type, fuel, consumption_l_100km, fuel_price,
                    amortization_eur_km, refrigerated, driver_type, hourly_cost,
                    prep_time_min, loading_time_min
                ) VALUES (
                    :id, :producerId, :type, :fuel, :consumption, :fuelPrice,
                    :amortization, :refrigerated, :driver, :hourlyCost,
                    :prepTime, :loadingTime
                )
                """)
                .param("id", id)
                .param("producerId", input.getProducerId())
                .param("type", input.getType().getValue())
                .param("fuel", input.getFuel().getValue())
                .param("consumption", input.getConsumptionL100Km())
                .param("fuelPrice", input.getFuelPrice())
                .param("amortization", input.getAmortizationEurKm())
                .param("refrigerated", input.getRefrigerated() != null ? input.getRefrigerated() : false)
                .param("driver", input.getDriverType() != null ? input.getDriverType().getValue() : null)
                .param("hourlyCost", input.getHourlyCost())
                .param("prepTime", input.getPrepTimeMin() != null ? input.getPrepTimeMin() : 0)
                .param("loadingTime", input.getLoadingTimeMin() != null ? input.getLoadingTimeMin() : 0)
                .update();
        return id;
    }

    int update(UUID id, VehicleUpdate input) {
        return jdbc.sql("""
                UPDATE vehicle SET
                    type                 = COALESCE(:type, type),
                    fuel                 = COALESCE(:fuel, fuel),
                    consumption_l_100km  = COALESCE(:consumption, consumption_l_100km),
                    fuel_price           = COALESCE(:fuelPrice, fuel_price),
                    amortization_eur_km  = COALESCE(:amortization, amortization_eur_km),
                    refrigerated         = COALESCE(:refrigerated, refrigerated),
                    driver_type          = COALESCE(:driver, driver_type),
                    hourly_cost          = COALESCE(:hourlyCost, hourly_cost),
                    prep_time_min        = COALESCE(:prepTime, prep_time_min),
                    loading_time_min     = COALESCE(:loadingTime, loading_time_min)
                WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", id)
                .param("type", input.getType() != null ? input.getType().getValue() : null)
                .param("fuel", input.getFuel() != null ? input.getFuel().getValue() : null)
                .param("consumption", input.getConsumptionL100Km())
                .param("fuelPrice", input.getFuelPrice())
                .param("amortization", input.getAmortizationEurKm())
                .param("refrigerated", input.getRefrigerated())
                .param("driver", input.getDriverType() != null ? input.getDriverType().getValue() : null)
                .param("hourlyCost", input.getHourlyCost())
                .param("prepTime", input.getPrepTimeMin())
                .param("loadingTime", input.getLoadingTimeMin())
                .update();
    }

    int softDelete(UUID id) {
        return jdbc.sql("UPDATE vehicle SET deleted_at = now() WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .update();
    }

    private Vehicle mapRow(ResultSet rs, int rowNum) throws SQLException {
        Vehicle v = new Vehicle();
        v.setId(rs.getObject("id", UUID.class));
        v.setProducerId(rs.getObject("producer_id", UUID.class));
        v.setType(VehicleType.fromValue(rs.getString("type")));
        v.setFuel(FuelType.fromValue(rs.getString("fuel")));
        v.setConsumptionL100Km(rs.getObject("consumption_l_100km") == null ? null : rs.getBigDecimal("consumption_l_100km").doubleValue());
        v.setFuelPrice(rs.getObject("fuel_price") == null ? null : rs.getBigDecimal("fuel_price").doubleValue());
        v.setAmortizationEurKm(rs.getObject("amortization_eur_km") == null ? null : rs.getBigDecimal("amortization_eur_km").doubleValue());
        v.setRefrigerated(rs.getBoolean("refrigerated"));
        String driver = rs.getString("driver_type");
        v.setDriverType(driver == null ? null : DriverType.fromValue(driver));
        v.setHourlyCost(rs.getObject("hourly_cost") == null ? null : rs.getBigDecimal("hourly_cost").doubleValue());
        v.setPrepTimeMin(rs.getInt("prep_time_min"));
        v.setLoadingTimeMin(rs.getInt("loading_time_min"));
        v.setCreatedAt(rs.getObject("created_at", OffsetDateTime.class));
        v.setUpdatedAt(rs.getObject("updated_at", OffsetDateTime.class));
        return v;
    }
}
