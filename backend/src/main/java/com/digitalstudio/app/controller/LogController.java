package com.digitalstudio.app.controller;

import com.digitalstudio.app.service.LogService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs() {
        return logService.subscribe();
    }

    @PostMapping("/clear")
    public ResponseEntity<Void> clearLogs() {
        logService.clearLogs();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/recent")
    public java.util.List<com.digitalstudio.app.service.LogService.LogEntry> getRecentLogs() {
        return logService.getRecentLogs();
    }
}
