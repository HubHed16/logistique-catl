-- =========================
-- ENUMS
-- =========================

CREATE TYPE storage_zone_type AS ENUM (
  'cold',
  'dry',
  'frozen'
);

CREATE TYPE stock_item_status AS ENUM (
  'available',
  'reserved',
  'blocked',
  'consumed'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled'
);

-- =========================
-- TABLES
-- =========================

CREATE TABLE cooperative (
                             id UUID PRIMARY KEY,
                             name VARCHAR(255) NOT NULL,
                             contact VARCHAR(255)
);

CREATE TABLE producer (
                          id UUID PRIMARY KEY,
                          name VARCHAR(255) NOT NULL,
                          contact VARCHAR(255),
                          address TEXT,
                          province VARCHAR(255),
                          is_bio BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE product (
                         id UUID PRIMARY KEY,
                         name VARCHAR(255) NOT NULL,
                         category VARCHAR(255),
                         ean VARCHAR(50) UNIQUE,
                         unit VARCHAR(50) NOT NULL,
                         storage_type VARCHAR(100),
                         is_bio BOOLEAN NOT NULL DEFAULT FALSE,
                         certification VARCHAR(255),
                         producer_id UUID NOT NULL,

                         CONSTRAINT fk_product_producer
                             FOREIGN KEY (producer_id)
                                 REFERENCES producer(id)
                                 ON UPDATE CASCADE
                                 ON DELETE RESTRICT
);

CREATE TABLE storage_zone (
                              id UUID PRIMARY KEY,
                              name VARCHAR(255) NOT NULL,
                              type storage_zone_type NOT NULL,
                              target_temp NUMERIC(6,2),
                              temp_min NUMERIC(6,2),
                              temp_max NUMERIC(6,2),

                              CONSTRAINT chk_storage_zone_temp_range
                                  CHECK (
                                      temp_min IS NULL
                                          OR temp_max IS NULL
                                          OR temp_min <= temp_max
                                      )
);

CREATE TABLE storage_location (
                                  id UUID PRIMARY KEY,
                                  label VARCHAR(100) NOT NULL,
                                  rack VARCHAR(100),
                                  position VARCHAR(100),
                                  temperature NUMERIC(6,2),
                                  zone_id UUID NOT NULL,

                                  CONSTRAINT uq_storage_location_label UNIQUE (label),

                                  CONSTRAINT fk_storage_location_zone
                                      FOREIGN KEY (zone_id)
                                          REFERENCES storage_zone(id)
                                          ON UPDATE CASCADE
                                          ON DELETE RESTRICT
);

CREATE TABLE stock_item (
                            id UUID PRIMARY KEY,
                            product_id UUID NOT NULL,
                            location_id UUID NOT NULL,
                            cooperative_id UUID NOT NULL,
                            lot_number VARCHAR(100) NOT NULL,
                            quantity NUMERIC(12,3) NOT NULL,
                            unit VARCHAR(50) NOT NULL,
                            weight_declared NUMERIC(12,3),
                            weight_actual NUMERIC(12,3),
                            reception_date DATE,
                            expiration_date DATE,
                            best_before DATE,
                            status stock_item_status NOT NULL DEFAULT 'available',
                            status_reason TEXT,
                            reception_temp NUMERIC(6,2),

                            CONSTRAINT chk_stock_item_quantity
                                CHECK (quantity >= 0),

                            CONSTRAINT chk_stock_item_weight_declared
                                CHECK (weight_declared IS NULL OR weight_declared >= 0),

                            CONSTRAINT chk_stock_item_weight_actual
                                CHECK (weight_actual IS NULL OR weight_actual >= 0),

                            CONSTRAINT fk_stock_item_product
                                FOREIGN KEY (product_id)
                                    REFERENCES product(id)
                                    ON UPDATE CASCADE
                                    ON DELETE RESTRICT,

                            CONSTRAINT fk_stock_item_location
                                FOREIGN KEY (location_id)
                                    REFERENCES storage_location(id)
                                    ON UPDATE CASCADE
                                    ON DELETE RESTRICT,

                            CONSTRAINT fk_stock_item_cooperative
                                FOREIGN KEY (cooperative_id)
                                    REFERENCES cooperative(id)
                                    ON UPDATE CASCADE
                                    ON DELETE RESTRICT
);

CREATE TABLE orders (
                        id UUID PRIMARY KEY,
                        cooperative_id UUID NOT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        shipped_at TIMESTAMP,
                        status order_status,

                        CONSTRAINT fk_orders_cooperative
                            FOREIGN KEY (cooperative_id)
                                REFERENCES cooperative(id)
                                ON UPDATE CASCADE
                                ON DELETE RESTRICT
);

CREATE TABLE order_line (
                            id UUID PRIMARY KEY,
                            order_id UUID NOT NULL,
                            product_id UUID NOT NULL,
                            stock_item_id UUID,
                            quantity_ordered NUMERIC(12,3) NOT NULL,
                            quantity_picked NUMERIC(12,3) NOT NULL DEFAULT 0,
                            article_price NUMERIC(12,2),
                            unit VARCHAR(50) NOT NULL,

                            CONSTRAINT chk_order_line_quantity_ordered
                                CHECK (quantity_ordered > 0),

                            CONSTRAINT chk_order_line_quantity_picked
                                CHECK (quantity_picked >= 0),

                            CONSTRAINT chk_order_line_article_price
                                CHECK (article_price IS NULL OR article_price >= 0),

                            CONSTRAINT fk_order_line_order
                                FOREIGN KEY (order_id)
                                    REFERENCES orders(id)
                                    ON UPDATE CASCADE
                                    ON DELETE CASCADE,

                            CONSTRAINT fk_order_line_product
                                FOREIGN KEY (product_id)
                                    REFERENCES product(id)
                                    ON UPDATE CASCADE
                                    ON DELETE RESTRICT,

                            CONSTRAINT fk_order_line_stock_item
                                FOREIGN KEY (stock_item_id)
                                    REFERENCES stock_item(id)
                                    ON UPDATE CASCADE
                                    ON DELETE SET NULL
);

-- =========================
-- INDEXES
-- =========================

CREATE INDEX idx_product_producer_id
    ON product(producer_id);

CREATE INDEX idx_storage_location_zone_id
    ON storage_location(zone_id);

CREATE INDEX idx_stock_item_product_id
    ON stock_item(product_id);

CREATE INDEX idx_stock_item_location_id
    ON stock_item(location_id);

CREATE INDEX idx_stock_item_cooperative_id
    ON stock_item(cooperative_id);

CREATE INDEX idx_stock_item_lot_number
    ON stock_item(lot_number);

CREATE INDEX idx_orders_cooperative_id
    ON orders(cooperative_id);

CREATE INDEX idx_orders_status
    ON orders(status);

CREATE INDEX idx_order_line_order_id
    ON order_line(order_id);

CREATE INDEX idx_order_line_product_id
    ON order_line(product_id);

CREATE INDEX idx_order_line_stock_item_id
    ON order_line(stock_item_id);