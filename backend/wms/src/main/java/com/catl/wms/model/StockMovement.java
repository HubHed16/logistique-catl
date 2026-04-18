package com.catl.wms.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stock_movement")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement {

    public enum MovementType {
        IN, OUT, TRANSFER, ADJUSTMENT, LOSS
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_item_id")
    private StockItem stockItem;

    @Enumerated(EnumType.STRING)
    private MovementType type;

    private Float quantity;

    private LocalDateTime timestamp;

    @Column(name = "order_id")
    private UUID orderId;

    private String reason;

    @Column(name = "operator_id")
    private UUID operatorId;
}