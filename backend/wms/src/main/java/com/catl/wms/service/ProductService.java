package com.catl.wms.service;

import com.catl.wms.dao.ProducerDao;
import com.catl.wms.dao.ProductDao;
import com.catl.wms.dto.ProductDto;
import com.catl.wms.repository.ProducerRepository;
import com.catl.wms.repository.ProductRepository;
import com.catl.wms.service.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {
    
    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    private final ProducerRepository producerRepository;
    
    public Page<ProductDto> getAllProduct(PageRequest pageRequest) {
        return productRepository.findAll(pageRequest).map(productMapper::getDto);
    }
    
    public Optional<ProductDto> getProductById(UUID id) {
        return productRepository.findById(id).map(productMapper::getDto);
    }

    public ProductDto saveOrUpdateProduct(UUID productId, ProductDto productDto) {
        ProductDao productDao;
        if (productId == null) {
            productDao = new ProductDao();
        } else {
            productDao = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found with id: " + productId));
        }

        ProducerDao producer = producerRepository.findById(productDto.producerId())
                .orElseThrow(() -> new RuntimeException("Producer not found with id: " + productDto.producerId()));

        productDao.setName(productDto.name());
        productDao.setCategory(productDto.category());
        productDao.setEan(productDto.ean());
        productDao.setUnit(productDto.unit());
        productDao.setStorageType(productDto.storageType());
        productDao.setBio(productDto.bio());
        productDao.setCertification(productDto.certification());
        productDao.setProducer(producer);

        ProductDao savedProduct = productRepository.save(productDao);
        return productMapper.getDto(savedProduct);
    }

    public void deleteProducer(UUID productId) {
        var product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + productId));
        productRepository.delete(product);
    }
}
