package com.catl.wms.controller;

import com.catl.wms.dto.cooperative.CooperativeRequest;
import com.catl.wms.dto.cooperative.CooperativeResponse;
import com.catl.wms.service.CooperativeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Page<CooperativeResponse>> list(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(cooperativeService.list(name, pageable));
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