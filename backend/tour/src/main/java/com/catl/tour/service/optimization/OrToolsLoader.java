package com.catl.tour.service.optimization;

import com.google.ortools.Loader;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
class OrToolsLoader {

    @PostConstruct
    void init() {
        Loader.loadNativeLibraries();
    }
}
