package com.catl.wms.repository;

import com.catl.wms.model.Cooperative;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CooperativeRepository extends JpaRepository<Cooperative, UUID> {}