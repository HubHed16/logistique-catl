package com.catl.wms.repository;

import com.catl.wms.model.StorageLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StorageLocationRepository extends JpaRepository<StorageLocation, UUID> {
    List<StorageLocation> findByZoneId(UUID zoneId);
}
