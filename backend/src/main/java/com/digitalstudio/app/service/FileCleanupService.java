package com.digitalstudio.app.service;

import com.digitalstudio.app.model.FileDeleteQueue;
import com.digitalstudio.app.model.SourceType;
import com.digitalstudio.app.model.Upload;
import com.digitalstudio.app.repository.FileDeleteQueueRepository;
import com.digitalstudio.app.repository.UploadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FileCleanupService {

    private final ConfigurationService configurationService;
    private final UploadRepository uploadRepository;
    private final FileDeleteQueueRepository fileDeleteQueueRepository;
    private final PlatformTransactionManager transactionManager;

    @Autowired
    public FileCleanupService(ConfigurationService configurationService,
            UploadRepository uploadRepository,
            FileDeleteQueueRepository fileDeleteQueueRepository,
            PlatformTransactionManager transactionManager) {
        this.configurationService = configurationService;
        this.uploadRepository = uploadRepository;
        this.fileDeleteQueueRepository = fileDeleteQueueRepository;
        this.transactionManager = transactionManager;
    }

    // --- User Actions ---

    @Transactional
    public void markSoftDeletedByUser(Upload upload, String remarks) {
        performSoftDelete(upload, remarks, "Deleted via user");
    }

    @Transactional
    public void recoverFile(Upload upload, String remarks) {
        upload.setMarkDeleted(false);

        // Remove from Queue
        fileDeleteQueueRepository.deleteByUploadId(upload.getUploadId());

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yy HH:mm"));
        String userRemark = (remarks != null && !remarks.trim().isEmpty()) ? "\nRemark : " + remarks : "";

        // Replaced logic as per requirement
        String newRemark = String.format("Recovered via user on %s%s", timestamp, userRemark);
        upload.setRemarks(newRemark);

        uploadRepository.save(upload);
    }

    // --- Schedulers ---

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 * * * * ?") // Every minute
    public void runScheduledTasks() {
        try {
            // Check time config
            String timeConfig = configurationService.getValue("FILE_DELETION_SCHEDULED_TIME");
            if (timeConfig != null && !timeConfig.trim().isEmpty()) {
                try {
                    java.time.LocalTime configTime = java.time.LocalTime.parse(timeConfig.trim());
                    java.time.LocalTime now = java.time.LocalTime.now();
                    if (now.getHour() != configTime.getHour() || now.getMinute() != configTime.getMinute()) {
                        return; // Not time yet
                    }
                } catch (Exception e) {
                    return; // Invalid config
                }
            } else {
                return; // Config not set
            }

            // Execute sequentially: Soft Delete First, then Hard Delete
            new TransactionTemplate(transactionManager).execute(status -> {
                doReceiptSoftDeleteCheck();
                return null;
            });

            new TransactionTemplate(transactionManager).execute(status -> {
                doHardDeleteCheck();
                return null;
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // --- Internal Logic ---

    private void doReceiptSoftDeleteCheck() {
        String durationStr = configurationService.getValue("BILL_PAYMENT_RECEIPT_DELETE_DURATION_DAYS");
        if (durationStr == null || durationStr.trim().isEmpty())
            return;

        try {
            int days = Integer.parseInt(durationStr.trim());
            if (days < 0)
                return;

            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);

            // Find bill payments older than cutoff and NOT deleted
            List<Upload> toSoftDelete = uploadRepository.findAll().stream()
                    .filter(u -> u.getUploadedFrom() == SourceType.BILL_PAYMENT)
                    .filter(u -> !u.isMarkDeleted())
                    .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isBefore(cutoff))
                    .collect(Collectors.toList());

            for (Upload upload : toSoftDelete) {
                performSoftDelete(upload, null, "Deleted via scheduler");
            }

        } catch (NumberFormatException e) {
            // Ignore
        }
    }

    private void performSoftDelete(Upload upload, String userRemarks, String sourcePrefix) {
        upload.setMarkDeleted(true);

        // Add to Queue if not exists
        if (fileDeleteQueueRepository.findByUploadId(upload.getUploadId()).isEmpty()) {
            FileDeleteQueue queueEntry = new FileDeleteQueue();
            queueEntry.setUploadId(upload.getUploadId());
            queueEntry.setSoftDeleteTime(LocalDateTime.now());
            fileDeleteQueueRepository.save(queueEntry);
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yy HH:mm"));
        String remarkContent = (userRemarks != null && !userRemarks.trim().isEmpty()) ? "\nRemark : " + userRemarks
                : "";

        String newRemark = String.format("%s on %s%s", sourcePrefix, timestamp, remarkContent);
        upload.setRemarks(newRemark);

        uploadRepository.save(upload);
    }

    private void doHardDeleteCheck() {
        String durationStr = configurationService.getValue("FILE_ABSOLUTE_DELETE_DAYS");
        if (durationStr == null || durationStr.trim().isEmpty())
            return;

        try {
            int days = Integer.parseInt(durationStr.trim());
            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);

            List<FileDeleteQueue> expiredEntries = fileDeleteQueueRepository.findAll().stream()
                    .filter(entry -> entry.getSoftDeleteTime().isBefore(cutoff))
                    .collect(Collectors.toList());

            for (FileDeleteQueue entry : expiredEntries) {
                Optional<Upload> uploadOpt = uploadRepository.findById(entry.getUploadId());
                if (uploadOpt.isPresent()) {
                    performHardDelete(uploadOpt.get());
                }
                // Convert ID to string for deletion if needed or just use object
                fileDeleteQueueRepository.delete(entry);
            }

        } catch (NumberFormatException e) {
            // Ignore
        }
    }

    private void performHardDelete(Upload upload) {
        if (upload.getUploadPath() != null) {
            try {
                Path path = Paths.get(upload.getUploadPath());
                Files.deleteIfExists(path);
            } catch (IOException e) {
                System.err.println("Failed to hard delete file: " + upload.getUploadPath());
            }
        }

        upload.setIsAvailable(false);
        // upload.setUploadPath(null); // Retain path as per user request

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yy HH:mm"));
        String appendRemark = String.format("\nFile removed on %s", timestamp);

        // Append instead of replace for Hard Delete
        String currentRemark = upload.getRemarks() != null ? upload.getRemarks() : "";
        upload.setRemarks(currentRemark + appendRemark);

        uploadRepository.save(upload);
    }
}
