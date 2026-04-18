package com.catl.wms.repository;

import com.catl.wms.model.OrderLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OrderLineRepository extends JpaRepository<OrderLine, UUID> {
    List<OrderLine> findByOrderId(UUID orderId);
    List<OrderLine> findByProductId(UUID productId);
}
