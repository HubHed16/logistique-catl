package com.catl.wms.dto.cooperative;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CooperativeRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String contact;
}