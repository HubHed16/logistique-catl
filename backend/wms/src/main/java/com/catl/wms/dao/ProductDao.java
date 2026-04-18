package com.catl.wms.dao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "product")
@Getter
@Setter
public class ProductDao {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "category")
    private String category;

    @Column(name = "ean", unique = true)
    private String ean;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Column(name = "storage_type")
    private String storageType;

    @Column(name = "is_bio", nullable = false)
    private boolean bio;

    @Column(name = "certification")
    private String certification;

    @ManyToOne
    @JoinColumn(name = "producer_id", nullable = false)
    private ProducerDao producer;
}
