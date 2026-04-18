package com.catl.wms.controller;

import com.catl.wms.dto.cooperative.CooperativeRequest;
import com.catl.wms.dto.cooperative.CooperativeResponse;
import com.catl.wms.service.CooperativeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cooperatives")
@RequiredArgsConstructor
public class CooperativeController {

    private final CooperativeService cooperativeService;

    @PostMapping
    public ResponseEntity<CooperativeResponse> create(@Valid @RequestBody CooperativeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cooperativeService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CooperativeResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(cooperativeService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<CooperativeResponse>> list(
            @RequestParam(required = false) String name) {

        if (name != null && !name.isBlank()) {
            return ResponseEntity.ok(cooperativeService.searchByName(name));
        }
        return ResponseEntity.ok(cooperativeService.listAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<CooperativeResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CooperativeRequest request) {
        return ResponseEntity.ok(cooperativeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        cooperativeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}