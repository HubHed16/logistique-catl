package com.catl.wms.repository;

import com.catl.wms.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByCategory(String category);
    Optional<Product> findByEan(String ean);
    List<Product> findByProducerId(UUID producerId);
    List<Product> findByIsBio(boolean isBio);
}
