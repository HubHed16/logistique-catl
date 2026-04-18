package com.catl.wms.service.mapper;

import com.catl.wms.dao.ProducerDao;
import com.catl.wms.dto.ProducerDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ProducerMapper {
    ProducerDto getDto(ProducerDao producerDao);
}
