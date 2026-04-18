package com.catl.wms.repository;

import com.catl.wms.model.Producer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProducerRepository extends JpaRepository<Producer, UUID> {
    List<Producer> findByCooperativeId(UUID cooperativeId);
    List<Producer> findByIsBio(boolean isBio);
}