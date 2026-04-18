package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "product")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String category;
    private String ean;
    private String unit;

    @Column(name = "storage_type")
    private String storageType;

    @Column(name = "is_bio")
    private boolean isBio;

    private String certification;

    @Column(name = "producer_id")
    private UUID producerId;
}