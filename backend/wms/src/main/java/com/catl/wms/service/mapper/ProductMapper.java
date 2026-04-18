package com.catl.wms.service.mapper;

import com.catl.wms.dto.ProductDto;
import com.catl.wms.model.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(target = "producerId", source = "producer.id")
    ProductDto getDto(Product productDao);
}
