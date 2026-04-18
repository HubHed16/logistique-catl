package com.catl.wms.repository;

import com.catl.wms.model.StockItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StockItemRepository extends JpaRepository<StockItem, UUID> {

    List<StockItem> findByProductId(UUID productId);
    List<StockItem> findByCooperativeId(UUID cooperativeId);
    List<StockItem> findByLocationId(UUID locationId);
    List<StockItem> findByStatus(StockItem.StockStatus status);
    List<StockItem> findByLotNumber(String lotNumber);


    @Query("""
        SELECT s FROM StockItem s
        WHERE s.expirationDate <= :limitDate
        AND s.status = com.catl.wms.model.StockItem$StockStatus.available
    """)
    List<StockItem> findExpiringBefore(@Param("limitDate") LocalDate limitDate);


    @Query("""
        SELECT s FROM StockItem s
        WHERE s.quantity <= :threshold
        AND s.status = com.catl.wms.model.StockItem$StockStatus.available
    """)
    List<StockItem> findLowStock(@Param("threshold") BigDecimal threshold);


    @Query("""
        SELECT s FROM StockItem s
        WHERE (:productId IS NULL OR s.product.id = :productId)
        AND (:cooperativeId IS NULL OR s.cooperative.id = :cooperativeId)
        AND (:locationId IS NULL OR s.location.id = :locationId)
        AND (:status IS NULL OR s.status = :status)
        AND (:lotNumber IS NULL OR s.lotNumber = :lotNumber)
    """)
    Page<StockItem> findWithFilters(
            @Param("productId") UUID productId,
            @Param("cooperativeId") UUID cooperativeId,
            @Param("locationId") UUID locationId,
            @Param("status") StockItem.StockStatus status,
            @Param("lotNumber") String lotNumber,
            Pageable pageable
    );
}