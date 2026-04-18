package com.catl.tour.controller;

import com.catl.tour.api.GeoApi;
import com.catl.tour.api.model.GeocodeRequest;
import com.catl.tour.api.model.GeocodeResult;
import com.catl.tour.api.model.RoutingRequest;
import com.catl.tour.api.model.RoutingResult;
import com.catl.tour.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class GeoController implements GeoApi {

    @Override
    public ResponseEntity<RoutingResult> computeRoute(RoutingRequest routingRequest) {
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED",
                "Routing provider (OSRM) is not yet wired up");
    }

    @Override
    public ResponseEntity<List<GeocodeResult>> geocode(GeocodeRequest geocodeRequest) {
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED",
                "Geocoding provider (Nominatim) is not yet wired up");
    }
}
