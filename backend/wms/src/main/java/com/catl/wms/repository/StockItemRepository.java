package com.catl.wms.repository;

import com.catl.wms.model.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StockItemRepository extends JpaRepository<StockItem, UUID> {
    List<StockItem> findByProductId(UUID productId);
    List<StockItem> findByCooperativeId(UUID cooperativeId);
    List<StockItem> findByStatus(StockItem.StockStatus status);
    List<StockItem> findByLocationId(UUID locationId);

    @Query("SELECT s FROM StockItem s WHERE s.expirationDate <= :limitDate AND s.status = 'AVAILABLE'")
    List<StockItem> findExpiringSoon(LocalDate limitDate);

    @Query("SELECT s FROM StockItem s WHERE s.quantity <= :threshold AND s.status = 'AVAILABLE'")
    List<StockItem> findLowStock(Float threshold);
}
