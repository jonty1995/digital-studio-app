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

    @PostMapping("/relay")
    public ResponseEntity<Void> relayLog(@RequestBody LogRequest request) {
        org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger("FRONTEND");
        String message = String.format("[%s] %s", request.getLevel(), request.getMessage());

        switch (request.getLevel().toUpperCase()) {
            case "ERROR":
                logger.error(message);
                break;
            case "WARN":
                logger.warn(message);
                break;
            default:
                logger.info(message);
                break;
        }
        return ResponseEntity.ok().build();
    }

    public static class LogRequest {
        private String level;
        private String message;

        public String getLevel() {
            return level;
        }

        public void setLevel(String level) {
            this.level = level;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
