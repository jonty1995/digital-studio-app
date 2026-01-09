package com.digitalstudio.app.config;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import com.digitalstudio.app.service.LogService;

public class MemoryAppender extends AppenderBase<ILoggingEvent> {

    private final LogService logService;

    public MemoryAppender(LogService logService) {
        this.logService = logService;
    }

    @Override
    protected void append(ILoggingEvent event) {
        if (logService != null) {
            logService.addLog(
                    event.getLevel().toString(),
                    event.getFormattedMessage(),
                    event.getThreadName());
        }
    }
}
