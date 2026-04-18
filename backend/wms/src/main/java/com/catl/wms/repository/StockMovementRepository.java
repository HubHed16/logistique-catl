package com.catl.wms.repository;

import com.catl.wms.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findByStockItemId(UUID stockItemId);
    List<StockMovement> findByType(StockMovement.MovementType type);
    List<StockMovement> findByOrderId(UUID orderId);
}
