package com.catl.wms.dto.reception;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReceptionLineItem {

    @NotNull(message = "OrderLine ID is required")
    private UUID orderLineId;

    @NotNull(message = "Quantity received is required")
    @PositiveOrZero(message = "Quantity cannot be negative")
    private Float quantityReceived;

    private String lotNumber;
    private Float weightActual;
    private LocalDate expirationDate;
    private LocalDate bestBefore;
}