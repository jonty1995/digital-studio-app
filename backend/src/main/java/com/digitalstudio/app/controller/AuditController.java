package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.AuditLog;
import com.digitalstudio.app.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(origins = "http://localhost:5173")
public class AuditController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) List<String> entityTypes) {

        if (startDate == null) startDate = LocalDateTime.now().minusDays(30);
        if (endDate == null) endDate = LocalDateTime.now();

        List<AuditLog> logs;
        if (entityTypes != null && !entityTypes.isEmpty() && !entityTypes.contains("All")) {
            logs = auditLogRepository.findByEntityNameInAndTimestampBetweenOrderByTimestampDesc(entityTypes, startDate, endDate);
        } else {
            logs = auditLogRepository.findByTimestampBetweenOrderByTimestampDesc(startDate, endDate);
        }
        return ResponseEntity.ok(logs);
    }
}
