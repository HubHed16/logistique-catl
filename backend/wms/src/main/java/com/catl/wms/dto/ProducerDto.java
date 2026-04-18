package com.catl.wms.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Optional;
import java.util.UUID;

public record ProducerDto(
        @JsonProperty("id") Optional<UUID> id,
        @JsonProperty("name") String name,
        @JsonProperty("contact") String contact,
        @JsonProperty("address") String address,
        @JsonProperty("province") String province,
        @JsonProperty("is_bio") boolean bio
) {}
