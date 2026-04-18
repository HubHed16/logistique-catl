package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "stock_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockItem {

    public enum StockStatus {
        AVAILABLE, RESERVED, BLOCKED, CONSUMED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private StorageLocation location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cooperative_id")
    private Cooperative cooperative;

    @Column(name = "lot_number")
    private String lotNumber;

    private Float quantity;
    private String unit;

    @Column(name = "weight_declared")
    private Float weightDeclared;

    @Column(name = "weight_actual")
    private Float weightActual;

    @Column(name = "reception_date")
    private LocalDate receptionDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(name = "best_before")
    private LocalDate bestBefore;

    @Enumerated(EnumType.STRING)
    private StockStatus status;

    @Column(name = "status_reason")
    private String statusReason;

    @Column(name = "reception_temp")
    private Float receptionTemp;
}