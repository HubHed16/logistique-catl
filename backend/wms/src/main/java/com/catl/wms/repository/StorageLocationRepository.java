package com.catl.wms.repository;

import com.catl.wms.model.StorageLocation;
import com.catl.wms.model.StorageZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StorageLocationRepository extends JpaRepository<StorageLocation, UUID> {
    List<StorageLocation> findByStorageLocationZoneId(UUID zoneId);
    List<StorageLocation> findByLabel(String label);
    List<StorageLocation> findByRack(String rack);
}