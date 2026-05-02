package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.Train;
import com.digitalstudio.app.service.TrainService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/train-list")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class TrainController {

    private final TrainService trainService;

    @GetMapping
    public List<Train> getAllTrains() {
        return trainService.getAllTrains();
    }

    @GetMapping("/search")
    public List<Train> searchTrains(@RequestParam String query) {
        return trainService.searchTrains(query);
    }

    @PostMapping("/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> refreshTrains() {
        try {
            trainService.refreshTrains();
            return ResponseEntity.ok(Map.of("message", "Trains refreshed successfully"));
        } catch (Exception e) {
            log.error("Error refreshing trains", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
