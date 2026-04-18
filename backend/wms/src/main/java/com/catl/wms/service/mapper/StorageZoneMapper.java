package com.catl.wms.service.mapper;

import com.catl.wms.dto.storage.StorageZoneDto;
import com.catl.wms.model.StorageZone;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StorageZoneMapper {
    StorageZoneDto getDto(StorageZone storageZone);
}
