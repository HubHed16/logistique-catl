package com.catl.wms.service.mapper;

import com.catl.wms.dao.ProductDao;
import com.catl.wms.dto.ProductDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ProductMapper {
    ProductDto getDto(ProductDao productDao);
}
