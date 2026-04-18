package com.catl.wms.repository;

import com.catl.wms.dao.ProducerDao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProducerRepository extends JpaRepository<ProducerDao,UUID> {}
