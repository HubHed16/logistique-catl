package com.catl.wms.service;

import com.catl.wms.dto.cooperative.CooperativeRequest;
import com.catl.wms.dto.cooperative.CooperativeResponse;
import com.catl.wms.model.Cooperative;
import com.catl.wms.repository.CooperativeRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CooperativeService {

    private final CooperativeRepository cooperativeRepository;

    // ===== CREATE =====

    @Transactional
    public CooperativeResponse create(CooperativeRequest request) {
        Cooperative cooperative = Cooperative.builder()
                .name(request.getName())
                .contact(request.getContact())
                .build();

        cooperative = cooperativeRepository.save(cooperative);
        return CooperativeResponse.from(cooperative);
    }

    // ===== READ =====

    public CooperativeResponse getById(UUID id) {
        Cooperative cooperative = cooperativeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + id));
        return CooperativeResponse.from(cooperative);
    }

    public List<CooperativeResponse> listAll() {
        return cooperativeRepository.findAll().stream()
                .map(CooperativeResponse::from)
                .toList();
    }

    /**
     * Liste paginée (avec recherche optionnelle par nom).
     */
    public Page<CooperativeResponse> list(String name, Pageable pageable) {
        Page<Cooperative> page;
        if (name != null && !name.isBlank()) {
            page = cooperativeRepository.findByNameContainingIgnoreCase(name, pageable);
        } else {
            page = cooperativeRepository.findAll(pageable);
        }
        return page.map(CooperativeResponse::from);
    }

    // ===== UPDATE =====

    @Transactional
    public CooperativeResponse update(UUID id, CooperativeRequest request) {
        Cooperative cooperative = cooperativeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Cooperative not found: " + id));

        cooperative.setName(request.getName());
        cooperative.setContact(request.getContact());

        cooperative = cooperativeRepository.save(cooperative);
        return CooperativeResponse.from(cooperative);
    }

    // ===== DELETE =====

    @Transactional
    public void delete(UUID id) {
        if (!cooperativeRepository.existsById(id)) {
            throw new IllegalArgumentException("Cooperative not found: " + id);
        }
        cooperativeRepository.deleteById(id);
    }
}