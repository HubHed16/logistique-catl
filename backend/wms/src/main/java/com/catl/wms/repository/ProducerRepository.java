package com.catl.wms.repository;

import com.catl.wms.model.Producer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProducerRepository extends JpaRepository<Producer,UUID> {}
