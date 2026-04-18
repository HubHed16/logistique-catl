package com.catl.wms.controller;

import com.catl.wms.dto.ProducerDto;
import com.catl.wms.service.ProducerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RequestMapping("/api/producers")
@RestController
@Tag(name = "Producer", description = "API to manage producers")
@RequiredArgsConstructor
public class ProducerController {

    private final ProducerService producerService;

    @GetMapping
    @Operation(summary = "Retrieve all producers with pagination")
    public ResponseEntity<List<ProducerDto>> getAllProducers(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        PageRequest pageRequest = PageRequest.of(page, size);
        Page<ProducerDto> producers = producerService.getAllProducer(pageRequest);

        if (producers.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(producers.getContent());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a producer by its ID")
    public ResponseEntity<ProducerDto> getProducerById(@PathVariable("id") UUID producerId) {
        return producerService.getProducerById(producerId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new producer")
    public ResponseEntity<ProducerDto> createProducer(@RequestBody ProducerDto producerDto) {
        ProducerDto created = producerService.saveOrUpdateProducer(null, producerDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Partially update a producer")
    public ResponseEntity<ProducerDto> patchProducer(
            @PathVariable("id") UUID producerId,
            @RequestBody ProducerDto producerDto) {

        ProducerDto result = producerService.saveOrUpdateProducer(producerId, producerDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a producer by its ID")
    public ResponseEntity<Void> deleteProducer(@PathVariable("id") UUID producerId) {
        producerService.deleteProducer(producerId);
        return ResponseEntity.noContent().build();
    }
}