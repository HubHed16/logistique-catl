package com.catl.wms.dto.cooperative;

import com.catl.wms.model.Cooperative;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CooperativeResponse {

    private UUID id;
    private String name;
    private String contact;

    public static CooperativeResponse from(Cooperative cooperative) {
        return CooperativeResponse.builder()
                .id(cooperative.getId())
                .name(cooperative.getName())
                .contact(cooperative.getContact())
                .build();
    }
}