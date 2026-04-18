package com.catl.wms.service.mapper;

import com.catl.wms.dto.storage.StorageLocationDto;
import com.catl.wms.model.StorageLocation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface StorageLocationMapper {

    @Mapping(target = "zoneId", source = "zone.id")
    StorageLocationDto getDto(StorageLocation storageLocation);
}
