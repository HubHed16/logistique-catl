package com.catl.wms.repository;

import com.catl.wms.model.StorageLocation;
import com.catl.wms.model.StorageZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StorageLocationRepository extends JpaRepository<StorageLocation, UUID> {

    List<StorageLocation> findByZoneId(UUID zoneId);


    @Query("""
        SELECT l FROM StorageLocation l
        WHERE l.zone.id = :zoneId
        AND l.id NOT IN (
            SELECT s.location.id FROM StockItem s
            WHERE s.location IS NOT NULL
            AND s.status = 'AVAILABLE'
        )
    """)
    List<StorageLocation> findAvailableInZone(@Param("zoneId") UUID zoneId);


    @Query("""
        SELECT l FROM StorageLocation l
        WHERE l.zone.type = :zoneType
        AND l.id NOT IN (
            SELECT s.location.id FROM StockItem s
            WHERE s.location IS NOT NULL
            AND s.status = 'AVAILABLE'
        )
    """)
    List<StorageLocation> findAvailableByZoneType(@Param("zoneType") StorageZone.ZoneType zoneType);
}