package com.catl.tour.controller;

import com.catl.tour.api.ProducerApi;
import com.catl.tour.api.model.Producer;
import com.catl.tour.api.model.ProducerPage;
import com.catl.tour.client.WmsClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
public class ProducerController implements ProducerApi {

    private final WmsClient wmsClient;

    public ProducerController(WmsClient wmsClient) {
        this.wmsClient = wmsClient;
    }

    @Override
    public ResponseEntity<ProducerPage> listProducers(Integer limit, Integer offset) {
        int pageNumber = offset / limit;
        List<WmsClient.ProducerDto> dtoList = wmsClient.getProducers(pageNumber, limit);

        if (dtoList == null || dtoList.isEmpty()) {
            return ResponseEntity.ok(new ProducerPage(0, limit, offset));
        }

        List<Producer> producers = dtoList.stream()
                .map(dto -> {
                    Producer p = new Producer();
                    p.setId(dto.id());
                    p.setName(dto.name());
                    p.setContact(dto.contact());
                    p.setAddress(dto.address());
                    p.setProvince(dto.province());
                    p.latitude(dto.latitude());
                    p.longitude(dto.longitude());
                    p.setIsBio(Optional.ofNullable(dto.is_bio()).orElse(false));
                    return p;
                })
                .collect(Collectors.toList());

        ProducerPage page = new ProducerPage(producers.size(), limit, offset); // Used actual count
        page.setItems(producers);

        return ResponseEntity.ok(page);
    }
}

