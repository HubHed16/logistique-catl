package com.catl.wms.repository;

import com.catl.wms.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByCooperativeId(UUID cooperativeId);
    List<Order> findByStatus(Order.OrderStatus status);
    List<Order> findByClientName(String clientName);
}
