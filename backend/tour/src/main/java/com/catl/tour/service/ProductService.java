package com.catl.tour.service;

import com.catl.tour.api.model.Product;
import com.catl.tour.api.model.ProductCreate;
import com.catl.tour.api.model.ProductPage;
import com.catl.tour.api.model.ProductUpdate;
import com.catl.tour.client.WmsClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final WmsClient wmsClient;

    ProductService(WmsClient wmsClient) {
        this.wmsClient = wmsClient;
    }

    public ProductPage list(UUID producerId, int limit, int offset) {
        int pageNumber = offset / limit;
        List<WmsClient.ProductDto> wmsProducts = wmsClient.getProducts(pageNumber, limit);

        if (wmsProducts == null || wmsProducts.isEmpty()) {
            return new ProductPage(0, limit, offset);
        }

        List<Product> products = wmsProducts.stream()
                .filter(p -> producerId == null || producerId.equals(p.producer_id()))
                .map(this::mapToProduct)
                .collect(Collectors.toList());

        ProductPage page = new ProductPage(products.size(), limit, offset);
        page.setItems(products);
        return page;
    }

    public Product get(UUID id) {
        if (id == null) throw new IllegalArgumentException("id is required");
        throw new UnsupportedOperationException("Read-only from WMS. Get by ID not fully implemented.");
    }

    public Product create(ProductCreate input) {
        if (input == null) throw new IllegalArgumentException("input is required");
        throw new UnsupportedOperationException("Products are managed by WMS.");
    }

    public Product update(UUID id, ProductUpdate input) {
        if (id == null || input == null) throw new IllegalArgumentException("id and input are required");
        throw new UnsupportedOperationException("Products are managed by WMS.");
    }

    public void delete(UUID id) {
        if (id == null) throw new IllegalArgumentException("id is required");
        throw new UnsupportedOperationException("Products are managed by WMS.");
    }

    private Product mapToProduct(WmsClient.ProductDto dto) {
        Product p = new Product();
        p.setId(dto.id());
        p.setProducerId(dto.producer_id());
        p.setName(dto.name());
        if (dto.category() != null) {
            p.setCategory(dto.category());
        }
        p.setUnit(dto.unit());
        p.setEan(dto.ean());
        p.setStorageType(dto.storage_type());
        p.setIsBio(dto.is_bio() != null ? dto.is_bio() : false);
        p.setCertification(dto.certification());
        return p;
    }
}
