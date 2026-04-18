package com.catl.wms.repository;

import com.catl.wms.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    @Query("""
        SELECT o FROM Order o
        WHERE (:status IS NULL OR o.status = :status)
        AND (:cooperativeId IS NULL OR o.cooperative.id = :cooperativeId)
        AND (:dateFrom IS NULL OR o.createdAt >= :dateFrom)
        AND (:dateTo IS NULL OR o.createdAt <= :dateTo)
        ORDER BY o.createdAt DESC
    """)
    List<Order> findWithFilters(
            @Param("status") Order.OrderStatus status,
            @Param("cooperativeId") UUID cooperativeId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo
    );
}