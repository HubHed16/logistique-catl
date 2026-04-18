package com.catl.wms.service.mapper;

import com.catl.wms.dto.stockitem.StockItemDto;
import com.catl.wms.model.StockItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface StockItemMapper {

    @Mapping(target = "productId", source = "stockItem.product.id")
    @Mapping(target = "locationId", source = "stockItem.location.id")
    @Mapping(target = "cooperativeId", source = "stockItem.cooperative.id")
    StockItemDto getDto(StockItem stockItem);
}
