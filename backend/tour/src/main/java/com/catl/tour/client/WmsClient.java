package com.catl.tour.client;

import com.catl.tour.service.optimization.GeoPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class WmsClient {

    private static final Logger log = LoggerFactory.getLogger(WmsClient.class);

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

    /**
     * Récupère les dépôts (lat/lon) des producteurs depuis l'API WMS.
     *
     * NOTE: l'API WMS n'expose pas (encore) un endpoint batch par IDs; on fait donc
     * une recherche paginée et on filtre côté Tour.
     */
    public Map<UUID, GeoPoint> getProducerDepots(Set<UUID> producerIds) {
        if (producerIds == null || producerIds.isEmpty()) return Map.of();

        Map<UUID, GeoPoint> out = new HashMap<>();
        Set<UUID> accountedFor = new HashSet<>(); // trouvés dans WMS (coords valides ou nulles)

        int page = 0;
        int size = 200; // toujours paginer en grands blocs pour éviter les bords de page
        while (accountedFor.size() < producerIds.size()) {
            List<ProducerDto> producers = getProducers(page, size);
            if (producers == null || producers.isEmpty()) break;

            for (ProducerDto p : producers) {
                if (p == null || p.id() == null) continue;
                if (!producerIds.contains(p.id())) continue;
                accountedFor.add(p.id());
                if (p.latitude() == null || p.longitude() == null) {
                    log.warn("Producer {} ({}) has no depot coordinates (lat/lon null) — excluded from optimization",
                            p.id(), p.name());
                    continue;
                }
                out.put(p.id(), new GeoPoint(p.latitude(), p.longitude()));
            }

            if (producers.size() < size) break;
            page++;
        }

        Set<UUID> notFound = new HashSet<>(producerIds);
        notFound.removeAll(accountedFor);
        if (!notFound.isEmpty()) {
            log.warn("Producers not found in WMS at all (missing records?) — excluded from optimization: {}", notFound);
        }

        return out;
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

    public record ProducerDto(UUID id, String name, String contact, String address, String province, Boolean is_bio, Double latitude, Double longitude) {}
    public record ProductDto(UUID id, String name, String category, String ean, String unit, String storage_type, Boolean is_bio, String certification, UUID producer_id) {}
}
