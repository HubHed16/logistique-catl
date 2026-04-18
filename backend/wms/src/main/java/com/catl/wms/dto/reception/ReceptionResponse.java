package com.catl.wms.dto.reception;

import com.catl.wms.model.Order;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ReceptionResponse {

    private UUID orderId;
    private String orderClientName;
    private Order.OrderStatus orderStatus;
    private LocalDate receptionDate;
    private Float receptionTemp;
    private int totalLines;
    private int linesWithDiscrepancy;
    private List<ReceptionLineResponse> lines;
}