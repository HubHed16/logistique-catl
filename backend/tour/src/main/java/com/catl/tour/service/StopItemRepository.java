package com.catl.tour.service;

import com.catl.tour.api.model.StopItem;
import com.catl.tour.api.model.StopItemCreate;
import com.catl.tour.api.model.StopItemUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class StopItemRepository {

    private final JdbcClient jdbc;

    StopItemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = "id, stop_id, product_id, quantity, unit_price ";

    List<StopItem> findByStop(UUID stopId) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM stop_item WHERE stop_id = :stopId ORDER BY id")
                .param("stopId", stopId)
                .query(this::mapRow)
                .list();
    }

    Optional<StopItem> findById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM stop_item WHERE id = :id")
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    UUID insert(UUID stopId, StopItemCreate input) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO stop_item (id, stop_id, product_id, quantity, unit_price)
                VALUES (:id, :stopId, :productId, :quantity, :unitPrice)
                """)
                .param("id", id)
                .param("stopId", stopId)
                .param("productId", input.getProductId())
                .param("quantity", input.getQuantity())
                .param("unitPrice", input.getUnitPrice())
                .update();
        return id;
    }

    int update(UUID id, StopItemUpdate input) {
        return jdbc.sql("""
                UPDATE stop_item SET
                    quantity   = COALESCE(:quantity, quantity),
                    unit_price = COALESCE(:unitPrice, unit_price)
                WHERE id = :id
                """)
                .param("id", id)
                .param("quantity", input.getQuantity())
                .param("unitPrice", input.getUnitPrice())
                .update();
    }

    int delete(UUID id) {
        return jdbc.sql("DELETE FROM stop_item WHERE id = :id").param("id", id).update();
    }

    private StopItem mapRow(ResultSet rs, int rowNum) throws SQLException {
        StopItem item = new StopItem();
        item.setId(rs.getObject("id", UUID.class));
        item.setStopId(rs.getObject("stop_id", UUID.class));
        item.setProductId(rs.getObject("product_id", UUID.class));
        item.setQuantity(rs.getBigDecimal("quantity").doubleValue());
        item.setUnitPrice(rs.getObject("unit_price") == null ? null : rs.getBigDecimal("unit_price").doubleValue());
        return item;
    }
}
