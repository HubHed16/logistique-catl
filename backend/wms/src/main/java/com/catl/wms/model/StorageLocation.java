package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "storage_location")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String label;

    private String rack;
    private String position;

    private Float temperature;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private StorageZone zone;
}