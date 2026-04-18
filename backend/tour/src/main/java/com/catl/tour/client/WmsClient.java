package com.catl.tour.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

@Component
public class WmsClient {

    private final RestClient restClient;

    public WmsClient(@Value("${wms.api.base-url}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public List<ProducerDto> getProducers(int page, int size) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/producers")
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<List<ProducerDto>>() {});
    }

    public List<ProductDto> getProducts(int page, int size) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/products")
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<List<ProductDto>>() {});
    }

    public record ProducerDto(UUID id, String name, String contact, String address, String province, Boolean is_bio) {}
    public record ProductDto(UUID id, String name, String category, String ean, String unit, String storage_type, Boolean is_bio, String certification, UUID producer_id) {}
}

