package com.catl.wms.dto.placement;

import lombok.Data;

import java.util.UUID;

@Data
public class ConfirmPlacementRequest {
    private UUID operatorId;
}