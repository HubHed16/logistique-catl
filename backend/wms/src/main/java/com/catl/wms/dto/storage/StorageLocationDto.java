package com.catl.wms.dto.storage;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record StorageLocationDto(@JsonProperty("id") UUID id,
                                @JsonProperty("label") String label,
                                @JsonProperty("rack") String rack,
                                @JsonProperty("position") String position,
                                @JsonProperty("temperature") String temperature,
                                @JsonProperty("zone_id") UUID zoneId) {}
