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
import java.util.UUID;

@RequestMapping("/api/products")
@RestController
@Tag(name = "Product", description = "API to manage products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Retrieve all products with pagination")
    public ResponseEntity<List<ProductDto>> getAllProducts(
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {

        PageRequest pageRequest = PageRequest.of(page, size);
        Page<ProductDto> products = productService.getAllProduct(pageRequest);

        if (products.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(products.getContent());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a product by its ID")
    public ResponseEntity<ProductDto> getProductById(@PathVariable("id") UUID productId) {
        return productService.getProductById(productId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Partially update a product")
    public ResponseEntity<ProductDto> patchProduct(
            @PathVariable("id") UUID productId,
            @RequestBody ProductDto productDto) {

        ProductDto result = productService.saveOrUpdateProduct(productId, productDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a product by its ID")
    public ResponseEntity<Void> deleteProduct(@PathVariable("id") UUID productId) {
        productService.deleteProduct(productId);
        return ResponseEntity.noContent().build();
    }
}