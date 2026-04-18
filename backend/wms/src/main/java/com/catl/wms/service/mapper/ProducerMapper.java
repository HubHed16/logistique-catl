package com.catl.wms.service.mapper;

import com.catl.wms.dto.ProducerDto;
import com.catl.wms.model.Producer;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ProducerMapper {
    ProducerDto getDto(Producer producerDao);
}
