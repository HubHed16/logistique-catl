package com.catl.wms.service;

import com.catl.wms.dto.reception.QualityControlRequest;
import com.catl.wms.dto.reception.ReceptionRequest;
import com.catl.wms.dto.reception.ReceptionResponse;
import com.catl.wms.model.*;
import com.catl.wms.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceptionService {

    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final CooperativeRepository cooperativeRepository;

    @Transactional
    public ReceptionResponse receiveProduct(ReceptionRequest request) {

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + request.getProductId()));

        Cooperative cooperative = cooperativeRepository.findById(request.getCooperativeId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + request.getCooperativeId()));

        StockItem stockItem = StockItem.builder()
                .product(product)
                .cooperative(cooperative)
                .lotNumber(request.getLotNumber())
                .quantity(request.getQuantity())
                .unit(request.getUnit())
                .weightDeclared(request.getWeightDeclared())
                .receptionTemp(request.getReceptionTemp())
                .receptionDate(request.getReceptionDate())
                .expirationDate(request.getExpirationDate())
                .bestBefore(request.getBestBefore())
                .status(StockItem.StockStatus.AVAILABLE)
                .build();

        stockItem = stockItemRepository.save(stockItem);

        StockMovement movement = StockMovement.builder()
                .stockItem(stockItem)
                .type(StockMovement.MovementType.IN)
                .quantity(request.getQuantity())
                .timestamp(LocalDateTime.now())
                .reason("Product reception")
                .operatorId(request.getOperatorId())
                .build();

        movement = stockMovementRepository.save(movement);

        return ReceptionResponse.from(stockItem, movement.getId());
    }

    @Transactional
    public ReceptionResponse qualityControl(QualityControlRequest request) {

        StockItem stockItem = stockItemRepository.findById(request.getStockItemId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + request.getStockItemId()));

        if (request.getPassed()) {
            stockItem.setStatus(StockItem.StockStatus.AVAILABLE);
            stockItem.setStatusReason("Quality control passed");
        } else {
            if (request.getReason() == null || request.getReason().isBlank()) {
                throw new IllegalArgumentException("Reason is required when quality control fails");
            }
            stockItem.setStatus(StockItem.StockStatus.QUARANTINE);
            stockItem.setStatusReason(request.getReason());

            StockMovement lossMovement = StockMovement.builder()
                    .stockItem(stockItem)
                    .type(StockMovement.MovementType.LOSS)
                    .quantity(stockItem.getQuantity())
                    .timestamp(LocalDateTime.now())
                    .reason("Quality control failed: " + request.getReason())
                    .operatorId(request.getOperatorId())
                    .build();

            stockMovementRepository.save(lossMovement);
        }

        stockItem = stockItemRepository.save(stockItem);
        return ReceptionResponse.from(stockItem, null);
    }

    @Transactional
    public ReceptionResponse scanReception(UUID stockItemId, Float weightActual, UUID operatorId) {

        StockItem stockItem = stockItemRepository.findById(stockItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "StockItem not found: " + stockItemId));

        if (weightActual != null) {
            stockItem.setWeightActual(weightActual);
        }

        stockItem = stockItemRepository.save(stockItem);

        StockMovement scanMovement = StockMovement.builder()
                .stockItem(stockItem)
                .type(StockMovement.MovementType.IN)
                .quantity(stockItem.getQuantity())
                .timestamp(LocalDateTime.now())
                .reason("Scan reception confirmed")
                .operatorId(operatorId)
                .build();

        StockMovement saved = stockMovementRepository.save(scanMovement);
        return ReceptionResponse.from(stockItem, saved.getId());
    }
}