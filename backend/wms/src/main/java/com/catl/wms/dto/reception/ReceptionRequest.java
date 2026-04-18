package com.catl.wms.dto.reception;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReceptionRequest {

    @NotNull(message = "Product ID is required")
    private UUID productId;

    @NotNull(message = "Cooperative ID is required")
    private UUID cooperativeId;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    private Float quantity;

    @NotNull(message = "Unit is required")
    private String unit;

    private String lotNumber;
    private Float weightDeclared;
    private Float receptionTemp;

    @NotNull(message = "Reception date is required")
    private LocalDate receptionDate;

    private LocalDate expirationDate;
    private LocalDate bestBefore;

    private UUID operatorId;
}