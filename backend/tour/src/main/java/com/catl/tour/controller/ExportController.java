package com.catl.tour.controller;

import com.catl.tour.api.ExportApi;
import com.catl.tour.api.model.EmailRouteRequest;
import com.catl.tour.exception.ApiException;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ExportController implements ExportApi {

    @Override
    public ResponseEntity<Void> emailRoute(UUID routeId, EmailRouteRequest emailRouteRequest) {
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED",
                "Email delivery is not yet wired up");
    }

    @Override
    public ResponseEntity<Resource> exportRouteGpx(UUID routeId) {
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED",
                "GPX export is not yet wired up");
    }

    @Override
    public ResponseEntity<Resource> exportRoutePdf(UUID routeId) {
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED",
                "PDF export is not yet wired up");
    }
}
