package com.catl.wms.service;

import com.catl.wms.dao.ProducerDao;
import com.catl.wms.dto.ProducerDto;
import com.catl.wms.repository.ProducerRepository;
import com.catl.wms.service.mapper.ProducerMapper;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@NoArgsConstructor
public class ProducerService {

    ProducerRepository producerRepository;
    ProducerMapper producerMapper;

    public Page<ProducerDto> getAllProducer(PageRequest pageRequest){
        return producerRepository.findAll(pageRequest).map(producerMapper::getDto);
    }

    public Optional<ProducerDto> getProducerById(UUID id) {
        return producerRepository.findById(id).map(producerMapper::getDto);
    }


    public ProducerDto saveOrUpdateProducer(UUID producerId, ProducerDto producerDto) {
           ProducerDao producerDao;
           if (producerId == null) {
               producerDao = new ProducerDao();
           } else {
               producerDao = producerRepository.findById(producerId)
                   .orElseThrow(() -> new RuntimeException("Producer not found with id: " + producerId));
           }
           producerDao.setName(producerDto.name());
           producerDao.setContact(producerDto.contact());
           producerDao.setAddress(producerDto.address());
           producerDao.setProvince(producerDto.province());
           producerDao.setBio(producerDto.bio());
           producerRepository.save(producerDao);
           return producerDto;
    }

    public void deleteProducer(UUID producerId) {
        var producer = producerRepository.findById(producerId)
                .orElseThrow(() -> new RuntimeException("Producer not found with id: " + producerId));
        producerRepository.delete(producer);
    }
}
