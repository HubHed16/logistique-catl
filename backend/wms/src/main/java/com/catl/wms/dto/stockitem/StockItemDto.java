package com.catl.wms.dto.stockitem;

import com.catl.wms.model.StockItem;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Nullable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StockItemDto(
        @Nullable @JsonProperty("id") UUID id,
        @JsonProperty("productId") UUID productId,
        @JsonProperty("productName") String productName,
        @JsonProperty("locationId") UUID locationId,
        @JsonProperty("locationLabel") String locationLabel,
        @JsonProperty("cooperativeId") UUID cooperativeId,
        @JsonProperty("cooperativeName") String cooperativeName,
        @JsonProperty("lotNumber") String lotNumber,
        @JsonProperty("quantity") BigDecimal quantity,
        @JsonProperty("unit") String unit,
        @JsonProperty("weightDeclared") BigDecimal weightDeclared,
        @JsonProperty("weightActual") BigDecimal weightActual,
        @JsonProperty("receptionDate") LocalDate receptionDate,
        @JsonProperty("expirationDate") LocalDate expirationDate,
        @JsonProperty("bestBefore") LocalDate bestBefore,
        @JsonProperty("status") StockItem.StockStatus status,
        @JsonProperty("statusReason") String statusReason,
        @JsonProperty("receptionTemp") BigDecimal receptionTemp
) {}