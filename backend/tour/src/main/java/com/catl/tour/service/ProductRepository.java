package com.catl.tour.service;

import com.catl.tour.api.model.Product;
import com.catl.tour.api.model.ProductCategory;
import com.catl.tour.api.model.ProductCreate;
import com.catl.tour.api.model.ProductUpdate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class ProductRepository {

    private final JdbcClient jdbc;

    ProductRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLS = """
            id, producer_id, name, category, unit, unit_price,
            created_at, updated_at
            """;

    List<Product> findByProducer(UUID producerId, int limit, int offset) {
        return jdbc.sql("SELECT " + SELECT_COLS + """
                FROM product
                WHERE producer_id = :producerId AND deleted_at IS NULL
                ORDER BY name ASC
                LIMIT :limit OFFSET :offset
                """)
                .param("producerId", producerId)
                .param("limit", limit)
                .param("offset", offset)
                .query(this::mapRow)
                .list();
    }

    long countByProducer(UUID producerId) {
        return jdbc.sql("SELECT COUNT(*) FROM product WHERE producer_id = :producerId AND deleted_at IS NULL")
                .param("producerId", producerId)
                .query(Long.class)
                .single();
    }

    Optional<Product> findById(UUID id) {
        return jdbc.sql("SELECT " + SELECT_COLS + "FROM product WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    UUID insert(ProductCreate input) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO product (
                    id, producer_id, name, category, unit, unit_price
                ) VALUES (
                    :id, :producerId, :name, :category, :unit, :unitPrice
                )
                """)
                .param("id", id)
                .param("producerId", input.getProducerId())
                .param("name", input.getName())
                .param("category", input.getCategory() != null ? input.getCategory().getValue() : null)
                .param("unit", input.getUnit())
                .param("unitPrice", input.getUnitPrice())
                .update();
        return id;
    }

    int update(UUID id, ProductUpdate input) {
        return jdbc.sql("""
                UPDATE product SET
                    name       = COALESCE(:name, name),
                    category   = COALESCE(:category, category),
                    unit       = COALESCE(:unit, unit),
                    unit_price = COALESCE(:unitPrice, unit_price)
                WHERE id = :id AND deleted_at IS NULL
                """)
                .param("id", id)
                .param("name", input.getName())
                .param("category", input.getCategory() != null ? input.getCategory().getValue() : null)
                .param("unit", input.getUnit())
                .param("unitPrice", input.getUnitPrice())
                .update();
    }

    int softDelete(UUID id) {
        return jdbc.sql("UPDATE product SET deleted_at = now() WHERE id = :id AND deleted_at IS NULL")
                .param("id", id)
                .update();
    }

    private Product mapRow(ResultSet rs, int rowNum) throws SQLException {
        Product p = new Product();
        p.setId(rs.getObject("id", UUID.class));
        p.setProducerId(rs.getObject("producer_id", UUID.class));
        p.setName(rs.getString("name"));
        String category = rs.getString("category");
        p.setCategory(category == null ? null : ProductCategory.fromValue(category));
        p.setUnit(rs.getString("unit"));
        p.setUnitPrice(rs.getObject("unit_price") == null ? null : rs.getBigDecimal("unit_price").doubleValue());
        p.setCreatedAt(rs.getObject("created_at", OffsetDateTime.class));
        p.setUpdatedAt(rs.getObject("updated_at", OffsetDateTime.class));
        return p;
    }
}
