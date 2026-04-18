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

    @GetMapping("/getAll")
    @Operation(summary = "Retrieve all producers with pagination")
    public ResponseEntity<List<ProducerDto>> getAllProducer(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        var pageRequest = PageRequest.of(page, size);
        Page<ProducerDto> producer = producerService.getAllProducer(pageRequest);

        if (producer.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(producer.getContent());
    }

    @GetMapping("getProducerById")
    @Operation(summary = "Retrieve a producer by its ID")
    public ResponseEntity<Optional<ProducerDto>> getProducerById(@RequestParam UUID id) {
        var producer = producerService.getProducerById(id);
        if (producer.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(producer);
    }


    @PostMapping("/producers")
    public ResponseEntity<ProducerDto> saveOrUpdateProducer(@RequestParam(required = false) UUID producerId, @RequestBody ProducerDto producerDto) {
        ProducerDto result = producerService.saveOrUpdateProducer(producerId, producerDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/producers")
    public ResponseEntity<Void> deleteProducer(@RequestParam UUID producerId) {
        producerService.deleteProducer(producerId);
        return ResponseEntity.noContent().build();
    }
}

