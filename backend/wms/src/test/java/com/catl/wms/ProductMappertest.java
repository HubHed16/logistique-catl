package com.catl.wms;

import com.catl.wms.dto.ProductDto;
import com.catl.wms.model.Producer;
import com.catl.wms.model.Product;
import com.catl.wms.service.mapper.ProductMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.UUID;

public class ProductMappertest {

    private final ProductMapper productMapper = Mappers.getMapper(ProductMapper.class);

    @Test
    void testProductMapper() {
        final Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setName("Test Product");
        product.setCategory("Test Category");
        product.setEan("123456789012");
        product.setUnit("pcs");
        product.setStorageType("Cool");
        product.setBio(true);
        product.setCertification("Organic");

        final Producer producer = new Producer();
        producer.setId(UUID.randomUUID());
        producer.setName("Test Producer");
        producer.setContact("contact");
        producer.setAddress("address");
        producer.setProvince("province");

        product.setProducer(producer);

        final ProductDto result = productMapper.getDto(product);

        final ProductDto expectedProduct = new ProductDto(
                product.getId(),
                product.getName(),
                product.getCategory(),
                product.getEan(),
                product.getUnit(),
                product.getStorageType(),
                product.isBio(),
                product.getCertification(),
                producer.getId()
        );

        Assertions.assertEquals(expectedProduct, result);

    }

}
