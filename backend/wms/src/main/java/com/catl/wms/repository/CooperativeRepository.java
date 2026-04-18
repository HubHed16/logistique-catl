package com.catl.wms.repository;

import com.catl.wms.model.Cooperative;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CooperativeRepository extends JpaRepository<Cooperative, UUID> {

    List<Cooperative> findByNameContainingIgnoreCase(String name);
}