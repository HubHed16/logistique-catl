package com.catl.wms.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record ProductDto(@JsonProperty("id") UUID id,
                         @JsonProperty("name") String name,
                         @JsonProperty("category") String category,
                         @JsonProperty("ean") String ean,
                         @JsonProperty("unit") String unit,
                         @JsonProperty("storage_type") String storageType,
                         @JsonProperty("is_bia") boolean bio,
                         @JsonProperty("certification") String certification,
                         @JsonProperty("producer_id") UUID producerId) {}