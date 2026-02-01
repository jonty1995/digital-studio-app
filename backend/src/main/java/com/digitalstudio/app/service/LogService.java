package com.digitalstudio.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class LogService {

    private final java.util.Deque<LogEntry> logBuffer = new java.util.concurrent.ConcurrentLinkedDeque<>();
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private static final Logger logger = LoggerFactory.getLogger(LogService.class);

    @org.springframework.beans.factory.annotation.Autowired
    private ConfigurationService configurationService;

    @jakarta.annotation.PostConstruct
    public void init() {
        ch.qos.logback.classic.LoggerContext lc = (ch.qos.logback.classic.LoggerContext) LoggerFactory
                .getILoggerFactory();
        ch.qos.logback.classic.Logger rootLogger = lc.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);

        com.digitalstudio.app.config.MemoryAppender appender = new com.digitalstudio.app.config.MemoryAppender(this);
        appender.setContext(lc);
        appender.setName("MEMORY");
        appender.start();

        rootLogger.addAppender(appender);
        logger.info("MemoryAppender registered successfully");
    }

    public record LogEntry(String timestamp, String level, String message, String thread) {
    }

    public void addLog(String level, String message, String thread) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));
        LogEntry entry = new LogEntry(timestamp, level, message, thread);

        logBuffer.offerLast(entry);

        // Dynamic Trimming
        int limit = 50000; // Default
        try {
            if (configurationService != null) {
                String configVal = configurationService.getValue("LOG_BUFFER_SIZE");
                if (configVal != null) {
                    limit = Integer.parseInt(configVal);
                }
            }
        } catch (Exception e) {
            // Fallback to default
        }

        while (logBuffer.size() > limit) {
            logBuffer.pollFirst();
        }

        broadcast(entry);
    }

    public List<LogEntry> getRecentLogs() {
        return new ArrayList<>(logBuffer);
    }

    public void clearLogs() {
        logBuffer.clear();
        broadcast(new LogEntry(LocalDateTime.now().toString(), "INFO", "--- LOGS CLEARED BY USER ---", "System"));
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE); // Infinite timeout

        try {
            // Send initial history
            emitter.send(SseEmitter.event().name("history").data(getRecentLogs()));
        } catch (IOException e) {
            emitter.complete();
            return null;
        }

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((e) -> emitters.remove(emitter));

        emitters.add(emitter);
        return emitter;
    }

    private void broadcast(LogEntry entry) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().name("log").data(entry));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        });
        emitters.removeAll(deadEmitters);
    }
}
