package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.LabProcessLog;
import com.digitalstudio.app.repository.LabProcessLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lab-process/logs")
@CrossOrigin(origins = "*")
public class LabProcessLogController {

    @Autowired
    private LabProcessLogRepository repository;

    @GetMapping
    public List<LabProcessLog> getAllLogs() {
        return repository.findAllByOrderByTimestampDesc();
    }

    @PostMapping
    @SuppressWarnings("null")
    public LabProcessLog createLog(@RequestBody LabProcessLog log) {
        return repository.save(log);
    }

    @DeleteMapping("/{id}")
    @SuppressWarnings("null")
    public ResponseEntity<Void> deleteLog(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
