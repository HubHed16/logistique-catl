package com.catl.wms.dao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "producer")
@Getter
@Setter
public class ProducerDao {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "contact", nullable = false)
    private String contact;

    @Column(name = "address", nullable = false)
    private String address;

    @Column(name = "province", nullable = false)
    private String province;

    @Column(name = "is_bio", nullable = false)
    private boolean bio;
}
