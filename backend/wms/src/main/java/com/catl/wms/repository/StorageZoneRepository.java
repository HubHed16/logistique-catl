package com.catl.wms.repository;

import com.catl.wms.model.StorageZone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StorageZoneRepository extends JpaRepository<StorageZone, UUID> {
    List<StorageZone> findByType(StorageZone.ZoneType type);
}
