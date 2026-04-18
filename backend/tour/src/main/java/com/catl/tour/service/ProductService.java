package com.catl.tour.service;

import com.catl.tour.api.model.Product;
import com.catl.tour.api.model.ProductCreate;
import com.catl.tour.api.model.ProductPage;
import com.catl.tour.api.model.ProductUpdate;
import com.catl.tour.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository repository;

    ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ProductPage list(UUID producerId, int limit, int offset) {
        long total = repository.countByProducer(producerId);
        ProductPage page = new ProductPage((int) total, limit, offset);
        page.setItems(repository.findByProducer(producerId, limit, offset));
        return page;
    }

    @Transactional(readOnly = true)
    public Product get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product", id));
    }

    @Transactional
    public Product create(ProductCreate input) {
        UUID id = repository.insert(input);
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product", id));
    }

    @Transactional
    public Product update(UUID id, ProductUpdate input) {
        int rows = repository.update(id, input);
        if (rows == 0) {
            throw new NotFoundException("Product", id);
        }
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product", id));
    }

    @Transactional
    public void delete(UUID id) {
        int rows = repository.softDelete(id);
        if (rows == 0) {
            throw new NotFoundException("Product", id);
        }
    }
}
