package com.digitalstudio.app.controller;

import lombok.Builder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

@RestController
@RequestMapping("/api/admin/system")
@PreAuthorize("hasRole('ADMIN')")
public class SystemMonitorController {

    @Value("${app.storage.path:/app/uploads}")
    private String uploadPath;

    @Value("${app.lab.path:/app/lab}")
    private String labPath;

    @GetMapping("/status")
    public ResponseEntity<SystemStatusDTO> getSystemStatus() {
        return ResponseEntity.ok(SystemStatusDTO.builder()
                .cpuTemp(getCPUTemp())
                .ramUsage(getRAMUsage())
                .diskSpace(getDiskSpace())
                .storageBreakdown(getStorageBreakdown())
                .build());
    }

    private String getCPUTemp() {
        try {
            // Path for Raspberry Pi 5 / Linux
            File tempFile = new File("/sys/class/thermal/thermal_zone0/temp");
            if (tempFile.exists()) {
                try (Scanner scanner = new Scanner(tempFile)) {
                    if (scanner.hasNextInt()) {
                        double temp = scanner.nextInt() / 1000.0;
                        return String.format("%.1f°C", temp);
                    }
                }
            }
        } catch (Exception e) {
            return "N/A";
        }
        return "N/A";
    }

    private String getRAMUsage() {
        try {
            // Using com.sun.management.OperatingSystemMXBean for accurate host memory
            com.sun.management.OperatingSystemMXBean osBean = 
                (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
            
            long total = osBean.getTotalMemorySize();
            long free = osBean.getFreeMemorySize();
            long used = total - free;

            return formatSize(used) + " / " + formatSize(total);
        } catch (Exception e) {
            return "N/A";
        }
    }

    private String getDiskSpace() {
        File root = new File("/");
        long total = root.getTotalSpace();
        long usable = root.getUsableSpace();
        long used = total - usable;
        int percent = total > 0 ? (int) ((used * 100) / total) : 0;
        return String.format("%s/%s (%d%% used)", formatSize(used), formatSize(total), percent);
    }

    private Map<String, String> getStorageBreakdown() {
        Map<String, String> breakdown = new HashMap<>();
        breakdown.put("Uploads", formatSize(getFolderSize(Paths.get(uploadPath))));
        breakdown.put("Lab Files", formatSize(getFolderSize(Paths.get(labPath))));
        breakdown.put("App Logs", formatSize(getFolderSize(Paths.get("/app/logs"))));
        return breakdown;
    }

    private long getFolderSize(Path path) {
        try {
            if (Files.exists(path)) {
                return Files.walk(path)
                        .filter(p -> p.toFile().isFile())
                        .mapToLong(p -> p.toFile().length())
                        .sum();
            }
        } catch (IOException e) {
            return 0;
        }
        return 0;
    }

    private String formatSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }

    @Data
    @Builder
    public static class SystemStatusDTO {
        private String cpuTemp;
        private String ramUsage;
        private String diskSpace;
        private Map<String, String> storageBreakdown;
    }
}
