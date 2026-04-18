package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "storage_zone")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageZone {

    public enum ZoneType {
        COLD, DRY, FROZEN, AMBIENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    private ZoneType type;

    @Column(name = "target_temp")
    private Float targetTemp;

    @Column(name = "temp_min")
    private Float tempMin;

    @Column(name = "temp_max")
    private Float tempMax;
}