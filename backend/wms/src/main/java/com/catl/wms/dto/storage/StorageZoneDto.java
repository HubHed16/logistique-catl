package com.catl.wms.dto.storage;

import com.catl.wms.model.StorageZone;
import com.fasterxml.jackson.annotation.JsonProperty;

public record StorageZoneDto(@JsonProperty("id") String id,
                             @JsonProperty("name") String name,
                             @JsonProperty("type") StorageZone.ZoneType type,
                             @JsonProperty("targetTemp") Float targetTemp,
                             @JsonProperty("tempMin") Float tempMin,
                             @JsonProperty("tempMax") Float tempMax) {}