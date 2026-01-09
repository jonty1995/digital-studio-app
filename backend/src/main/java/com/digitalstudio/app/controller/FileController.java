package com.digitalstudio.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;

import com.digitalstudio.app.model.PhotoOrder;
import com.digitalstudio.app.model.Upload;
import com.digitalstudio.app.repository.PhotoOrderRepository;
import com.digitalstudio.app.repository.UploadRepository;
import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.service.ConfigurationService;
import com.digitalstudio.app.model.Customer;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileController {

    @Autowired
    private ConfigurationService configurationService;

    @Autowired
    private UploadRepository uploadRepository;

    @Autowired
    private CustomerRepository customerRepository;

    private String getUploadDir() {
        String path = configurationService.getValue("STORAGE_PATH");
        if (path == null || path.trim().isEmpty()) {
            throw new RuntimeException("STORAGE_PATH_NOT_CONFIGURED");
        }
        if (!path.endsWith("/") && !path.endsWith("\\")) {
            path += "/";
        }
        return path;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "source", required = false) String source) {

        int maxRetries = 5;
        int currentAttempt = 0;
        Exception lastException = null;

        while (currentAttempt < maxRetries) {
            currentAttempt++;
            try {
                String uploadDir = getUploadDir();
                // Ensure directory exists
                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                // Generate Generated ID: FYYMMDDNNN
                // We move generation INSIDE the loop to get a fresh ID on retry
                String generatedId = generateFileId();

                // Extension
                String originalName = file.getOriginalFilename();
                String ext = "";
                if (originalName != null && originalName.lastIndexOf(".") != -1) {
                    ext = originalName.substring(originalName.lastIndexOf("."));
                }

                String finalFilename = generatedId + ext;
                Path path = Paths.get(uploadDir + finalFilename);

                // Save to DB Object first
                Upload upload = new Upload();
                upload.setUploadId(generatedId);
                upload.setOriginalFilename(originalName);
                upload.setExtension(ext);
                upload.setUploadPath(path.toString());
                upload.setIsAvailable(true); // Default to true as we write file immediately

                // Resolve Source Type
                if (source != null) {
                    com.digitalstudio.app.model.SourceType sourceType = com.digitalstudio.app.model.SourceType
                            .fromString(source);
                    if (sourceType == null) {
                        try {
                            sourceType = com.digitalstudio.app.model.SourceType
                                    .valueOf(source.toUpperCase().replace(" ", "_"));
                        } catch (IllegalArgumentException e) {
                        }
                    }
                    upload.setUploadedFrom(sourceType);
                }

                // Attempt to Save DB -> This might throw ConstraintViolation if ID exists
                uploadRepository.save(upload);

                // If DB Save succeeds, Write File
                // (We do this AFTER DB save or concurrently, but if DB fails we don't want
                // orphan file efficiently.
                // However, we need 'path' for DB.
                // Optimally: Write File -> Save DB. If DB error (duplicate), delete file?
                // Or: Random ID? No, sequential.
                // If we Save DB first, we reserve the ID. Then we write file.
                // If write fails, we should delete DB entry?
                // Actually, existing logic wrote file first.
                // Problem: If we write file F...014, then DB fail, we have orphan 014 file.
                // Next retry gets 015.
                // Orphan 014 is acceptable garbage or we can try to delete it in catch.

                Files.write(path, file.getBytes());

                // Response
                Map<String, String> response = new HashMap<>();
                response.put("filename", finalFilename);
                response.put("uploadId", generatedId + ext);
                response.put("originalName", originalName);
                response.put("path", path.toString());

                return ResponseEntity.ok(response);

            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                // Duplicate Key -> Retry
                lastException = e;
                System.out.println("Duplicate Upload ID encountered (Attempt " + currentAttempt + "). Retrying...");
                try {
                    Thread.sleep(50);
                } catch (InterruptedException ie) {
                }
                continue;
            } catch (RuntimeException e) {
                if ("STORAGE_PATH_NOT_CONFIGURED".equals(e.getMessage())) {
                    return ResponseEntity.status(503).body(Map.of("error", "STORAGE_PATH_NOT_CONFIGURED"));
                }
                e.printStackTrace();
                return ResponseEntity.status(500).body(Map.of("error", "Failed to upload: " + e.getMessage()));
            } catch (Throwable e) {
                e.printStackTrace();
                return ResponseEntity.status(500)
                        .body(Map.of("error", "Failed to upload (Critical): " + e.getMessage()));
            }
        }

        return ResponseEntity.status(500)
                .body(Map.of("error", "Failed to generate unique ID after retries. Last Error: "
                        + (lastException != null ? lastException.getMessage() : "Unknown")));
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<?> serveFile(@PathVariable String filename) {
        try {
            // 1. Mandatory: Serve using the absolute path from DB
            String uploadId = filename;
            if (filename.contains(".")) {
                uploadId = filename.substring(0, filename.lastIndexOf("."));
            }

            // Strict lookup by ID
            Optional<Upload> upload = uploadRepository.findById(uploadId);
            if (upload.isPresent()) {
                String dbPath = upload.get().getUploadPath();
                if (dbPath != null && !dbPath.isEmpty()) {
                    Path path = Paths.get(dbPath);
                    org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(
                            path.toUri());
                    if (resource.exists() || resource.isReadable()) {
                        String contentType = "application/octet-stream";
                        try {
                            contentType = Files.probeContentType(path);
                        } catch (IOException ex) {
                        }

                        return ResponseEntity.ok()
                                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                                        "inline; filename=\"" + resource.getFilename() + "\"")
                                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                                .body(resource);
                    }
                }
            }

            // If DB record missing or file not found at specific path -> 404
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            if ("STORAGE_PATH_NOT_CONFIGURED".equals(e.getMessage())) {
                return ResponseEntity.status(503).body("STORAGE_PATH_NOT_CONFIGURED"); // Simple string or JSON
            }
            return ResponseEntity.status(500).build();
        } catch (java.net.MalformedURLException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Autowired
    private PhotoOrderRepository photoOrderRepository;

    @PostMapping("/check-availability")
    public ResponseEntity<Map<String, Object>> checkAvailability() {
        // Here we just check existing file paths as stored in DB.
        // We don't necessarily need getUploadDir() unless we want to validate they are
        // inside it.
        // But the requirement is just checking existence.

        int availableCount = 0;
        int missingCount = 0;
        List<Upload> uploads = uploadRepository.findAll();

        for (Upload u : uploads) {
            // Optimization: If previously checked and missing, assume lost forever per user
            // request
            if (Boolean.FALSE.equals(u.getIsAvailable())) {
                missingCount++;
                continue;
            }

            try {
                Path path = Paths.get(u.getUploadPath());
                boolean exists = Files.exists(path);
                u.setIsAvailable(exists);
                if (exists) {
                    availableCount++;
                } else {
                    missingCount++;
                }
            } catch (Exception e) {
                u.setIsAvailable(false);
                missingCount++;
            }
        }
        uploadRepository.saveAll(uploads);

        return ResponseEntity.ok(Map.of(
                "message", "Availability check complete",
                "available", availableCount,
                "missing", missingCount,
                "total", uploads.size()));
    }

    @Autowired
    private com.digitalstudio.app.repository.BillPaymentRepository billPaymentRepository;

    @Autowired
    private com.digitalstudio.app.service.FileCleanupService fileCleanupService;

    @GetMapping
    public List<Upload> getAllUploads() {
        List<Upload> uploads = uploadRepository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));

        // Fetch all orders to link customers
        List<PhotoOrder> orders = photoOrderRepository.findAll();
        List<com.digitalstudio.app.model.BillPaymentTransaction> billPayments = billPaymentRepository.findAll();

        // Map UploadID -> List of Customer IDs
        Map<String, List<String>> uploadCustomerMap = new HashMap<>();

        // 1. Link Photo Orders
        for (PhotoOrder order : orders) {
            String uId = order.getUploadId();
            if (uId != null && order.getCustomer() != null && order.getCustomer().getId() != null) {
                // Strip extension if present to match Upload ID format (e.g. F231230001.jpg ->
                // F231230001)
                if (uId.contains(".")) {
                    uId = uId.substring(0, uId.lastIndexOf("."));
                }
                uploadCustomerMap.computeIfAbsent(uId, k -> new ArrayList<>())
                        .add(String.valueOf(order.getCustomer().getId()));
            }
        }

        // 2. Link Bill Payments
        for (com.digitalstudio.app.model.BillPaymentTransaction bp : billPayments) {
            String uId = bp.getUploadId();
            if (uId != null && bp.getCustomer() != null && bp.getCustomer().getId() != null) {
                // Strip extension if present
                if (uId.contains(".")) {
                    uId = uId.substring(0, uId.lastIndexOf("."));
                }
                uploadCustomerMap.computeIfAbsent(uId, k -> new ArrayList<>())
                        .add(String.valueOf(bp.getCustomer().getId()));
            }
        }

        // Populate transient field
        for (Upload upload : uploads) {
            List<String> ids = uploadCustomerMap.getOrDefault(upload.getUploadId(), new ArrayList<>());
            // Add Direct Link
            if (upload.getLinkedCustomer() != null) {
                ids.add(String.valueOf(upload.getLinkedCustomer().getId()));
            }
            // Dedup
            upload.setCustomerIds(ids.stream().distinct().collect(java.util.stream.Collectors.toList()));
        }

        return uploads;
    }

    @GetMapping("/lookup/{id}")
    public ResponseEntity<Map<String, String>> lookupFile(@PathVariable String id) {
        return uploadRepository.findById(id)
                .map(upload -> {
                    Map<String, String> response = new HashMap<>();
                    response.put("filename", upload.getUploadId() + upload.getExtension());
                    response.put("uploadId", upload.getUploadId() + upload.getExtension()); // Return ID + Ext
                    response.put("source",
                            upload.getUploadedFrom() != null ? upload.getUploadedFrom().getDisplayName() : null);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private synchronized String generateFileId() throws IOException {
        LocalDate now = LocalDate.now();
        String dateStr = now.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = "F" + dateStr;

        String maxId = uploadRepository.findMaxUploadIdByPrefix(prefix);

        if (maxId != null) {
            try {
                // Extract last 3 digits: F251230005 -> 005
                // Assuming format is always Prefix + 3 digits.
                // If ID has extension or suffix, logic needs to be robust.
                // But DB stores pure ID in `uploadId` (e.g. F251230005).
                if (maxId.length() >= 3) {
                    String seqStr = maxId.substring(maxId.length() - 3);
                    int seq = Integer.parseInt(seqStr);
                    return prefix + String.format("%03d", seq + 1);
                }
            } catch (Exception e) {
                // Fallback or log error
                e.printStackTrace();
            }
        }

        return prefix + "001";
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(@PathVariable String id, @RequestParam(required = false) String remarks) {
        try {
            // Strip extension if present to match DB ID
            if (id.contains(".")) {
                id = id.substring(0, id.lastIndexOf("."));
            }

            Optional<Upload> uploadOpt = uploadRepository.findById(id);
            if (uploadOpt.isPresent()) {
                Upload upload = uploadOpt.get();

                // Soft Delete Logic via Service
                fileCleanupService.markSoftDeletedByUser(upload, remarks);

                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete file: " + e.getMessage()));
        }
    }

    @PostMapping("/recover/{id}")
    public ResponseEntity<?> recoverFile(@PathVariable String id, @RequestParam(required = false) String remarks) {
        try {
            if (id.contains(".")) {
                id = id.substring(0, id.lastIndexOf("."));
            }

            Optional<Upload> uploadOpt = uploadRepository.findById(id);
            if (uploadOpt.isPresent()) {
                Upload upload = uploadOpt.get();

                if (!upload.isMarkDeleted()) {
                    return ResponseEntity.badRequest().body("File is not marked for deletion.");
                }

                fileCleanupService.recoverFile(upload, remarks);

                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to recover file: " + e.getMessage()));
        }
    }

    @PostMapping("/link")
    public ResponseEntity<?> linkFile(@RequestBody Map<String, Object> payload) {
        try {
            String uploadId = (String) payload.get("uploadId");
            // Handle ID extraction if needed (remove extension)
            if (uploadId != null && uploadId.contains(".")) {
                uploadId = uploadId.substring(0, uploadId.lastIndexOf("."));
            }

            Object custIdObj = payload.get("customerId");
            Long customerId = null;
            if (custIdObj instanceof Integer)
                customerId = ((Integer) custIdObj).longValue();
            if (custIdObj instanceof Long)
                customerId = (Long) custIdObj;
            if (custIdObj instanceof String)
                customerId = Long.parseLong((String) custIdObj);

            if (uploadId == null || customerId == null) {
                return ResponseEntity.badRequest().body("Missing uploadId or customerId");
            }

            Optional<Upload> uploadOpt = uploadRepository.findById(uploadId);
            Optional<Customer> customerOpt = customerRepository.findById(customerId);

            if (uploadOpt.isPresent() && customerOpt.isPresent()) {
                Upload upload = uploadOpt.get();
                upload.setLinkedCustomer(customerOpt.get());
                uploadRepository.save(upload);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error linking file: " + e.getMessage());
        }
    }
}
