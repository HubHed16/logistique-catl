package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "\"order\"")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    public enum ClientType {
        INDIVIDUAL, ASSOCIATION, RESTAURANT, SCHOOL, OTHER
    }

    public enum OrderChannel {
        ONLINE, PHONE, IN_PERSON
    }

    public enum OrderStatus {
        PENDING, CONFIRMED, PICKING, SHIPPED, DELIVERED, CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cooperative_id")
    private Cooperative cooperative;

    @Column(name = "client_name")
    private String clientName;

    @Enumerated(EnumType.STRING)
    @Column(name = "client_type")
    private ClientType clientType;

    @Enumerated(EnumType.STRING)
    private OrderChannel channel;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;
}