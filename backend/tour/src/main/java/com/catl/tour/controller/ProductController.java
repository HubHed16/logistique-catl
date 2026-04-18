package com.catl.tour.controller;

import com.catl.tour.api.ProductApi;
import com.catl.tour.api.model.Product;
import com.catl.tour.api.model.ProductCreate;
import com.catl.tour.api.model.ProductPage;
import com.catl.tour.api.model.ProductUpdate;
import com.catl.tour.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ProductController implements ProductApi {

    private final ProductService service;

    ProductController(ProductService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<ProductPage> listProducts(UUID producerId, Integer limit, Integer offset) {
        return ResponseEntity.ok(service.list(producerId, limit, offset));
    }

    @Override
    public ResponseEntity<Product> getProduct(UUID productId) {
        return ResponseEntity.ok(service.get(productId));
    }

    @Override
    public ResponseEntity<Product> createProduct(ProductCreate productCreate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(productCreate));
    }

    @Override
    public ResponseEntity<Product> updateProduct(UUID productId, ProductUpdate productUpdate) {
        return ResponseEntity.ok(service.update(productId, productUpdate));
    }

    @Override
    public ResponseEntity<Void> deleteProduct(UUID productId) {
        service.delete(productId);
        return ResponseEntity.noContent().build();
    }
}
