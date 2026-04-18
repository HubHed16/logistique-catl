package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "producer")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String contact;

    private String address;

    private String province;

    @Column(name = "is_bio", nullable = false)
    private boolean isBio;
}
