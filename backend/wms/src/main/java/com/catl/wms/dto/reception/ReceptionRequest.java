package com.catl.wms.dto.reception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class ReceptionRequest {

    @NotNull(message = "Order ID is required")
    private UUID orderId;

    @NotNull(message = "Reception date is required")
    private LocalDate receptionDate;

    private Float receptionTemp;

    private UUID operatorId;

    @NotEmpty(message = "At least one line is required")
    @Valid
    private List<ReceptionLineItem> lines;
}