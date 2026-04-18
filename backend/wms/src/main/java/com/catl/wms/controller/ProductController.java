package com.catl.wms.controller;

import com.catl.wms.dto.ProductDto;
import com.catl.wms.service.ProductService;
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

@RequestMapping("/api/product")
@RestController
@Tag(name = "Product", description = "API to manage products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping("/getAllProduct")
    @Operation(summary = "Retrieve all products with pagination")
    public ResponseEntity<List<ProductDto>> getAllProduct(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        var pageRequest = PageRequest.of(page, size);
        Page<ProductDto> producer = productService.getAllProduct(pageRequest);

        if (producer.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(producer.getContent());
    }


    @GetMapping("/getProductById")
    @Operation(summary = "Retrieve a product by its ID")
    public ResponseEntity<Optional<ProductDto>> getProductById(@RequestParam UUID idProduct){
        var producer = productService.getProductById(idProduct);
        if (producer.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(producer);
    }

    @PostMapping("/products")
    public ResponseEntity<ProductDto> saveOrUpdateProducer(@RequestParam(required = false) UUID productId, @RequestBody ProductDto productDto) {
        ProductDto result = productService.saveOrUpdateProduct(productId, productDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/producers")
    public ResponseEntity<Void> deleteProducer(@RequestParam UUID productId) {
        productService.deleteProducer(productId);
        return ResponseEntity.noContent().build();
    }
}
