package com.catl.tour.service.optimization;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;

/**
 * DistanceProvider basé sur l'endpoint OSRM /route/v1/driving (point-à-point).
 *
 * On lit la réponse en String puis on la parse avec Jackson (JsonNode) pour éviter
 * les problèmes de désérialisation génériques de RestClient sans convertisseurs configurés.
 *
 * Coordonnées toujours en Locale.US — %f en locale française produit "50,879800"
 * au lieu de "50.879800", cassant silencieusement toutes les requêtes OSRM.
 */
@Component
@Primary
public class OsrmDistanceProvider implements DistanceProvider {

    private static final Logger log = LoggerFactory.getLogger(OsrmDistanceProvider.class);

    private final String baseUrl;
    private final String profile;
    private final DistanceProvider fallback;
    private final boolean enabled;
    private final RestClient rest;
    private final ObjectMapper mapper;

    public OsrmDistanceProvider(
            @Value("${osrm.base-url:https://routing.openstreetmap.de}") String baseUrl,
            @Value("${osrm.profile:routed-car}") String profile,
            @Value("${osrm.enabled:true}") boolean enabled,
            @Value("${osrm.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${osrm.read-timeout-ms:5000}") int readTimeoutMs,
            @Qualifier("haversineDistanceProvider") DistanceProvider fallback
    ) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.profile = profile;
        this.enabled = enabled;
        this.fallback = fallback;
        this.mapper = new ObjectMapper();

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        this.rest = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("User-Agent", "CATL-tour-backend")
                // JDK HttpClient ne décompresse pas gzip automatiquement — on demande
                // explicitement du texte brut pour éviter la ZipException côté Spring.
                .defaultHeader("Accept-Encoding", "identity")
                .build();
    }

    @Override
    public double km(double lat1, double lon1, double lat2, double lon2) {
        if (!enabled) return fallback.km(lat1, lon1, lat2, lon2);
        if (lat1 == lat2 && lon1 == lon2) return 0.0;

        String coords = String.format(Locale.US, "%.6f,%.6f;%.6f,%.6f", lon1, lat1, lon2, lat2);
        String rawUrl = baseUrl + "/" + profile + "/route/v1/driving/" + coords + "?overview=false";

        try {
            String body = rest.get()
                    .uri(URI.create(rawUrl))
                    .retrieve()
                    .body(String.class);

            if (body == null || body.isBlank()) return fallback.km(lat1, lon1, lat2, lon2);

            JsonNode root = mapper.readTree(body);
            JsonNode routes = root.path("routes");
            if (!routes.isArray() || routes.isEmpty()) return fallback.km(lat1, lon1, lat2, lon2);

            JsonNode distNode = routes.get(0).path("distance");
            if (distNode.isMissingNode() || !distNode.isNumber()) return fallback.km(lat1, lon1, lat2, lon2);

            double km = distNode.asDouble() / 1000.0;
            if (!Double.isFinite(km) || km <= 0) return fallback.km(lat1, lon1, lat2, lon2);
            return km;

        } catch (Exception e) {
            log.warn("OSRM call failed ({}), falling back to Haversine: {}", rawUrl, e.getMessage());
            return fallback.km(lat1, lon1, lat2, lon2);
        }
    }
}
