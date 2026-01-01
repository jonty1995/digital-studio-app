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
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import com.digitalstudio.app.model.PhotoOrder;
import com.digitalstudio.app.model.Upload;
import com.digitalstudio.app.repository.PhotoOrderRepository;
import com.digitalstudio.app.repository.UploadRepository;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.digitalstudio.app.service.ConfigurationService configurationService;

    @org.springframework.beans.factory.annotation.Autowired
    private com.digitalstudio.app.repository.UploadRepository uploadRepository;

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
        try {
            String uploadDir = getUploadDir();
            // Ensure directory exists
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // Generate Generated ID: FYYMMDDNNN
            String generatedId = generateFileId();
            
            // Extension
            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.lastIndexOf(".") != -1) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            
            String finalFilename = generatedId + ext;

            // Save File
            Path path = Paths.get(uploadDir + finalFilename);
            Files.write(path, file.getBytes());

            // Save to DB
            com.digitalstudio.app.model.Upload upload = new com.digitalstudio.app.model.Upload();
            upload.setUploadId(generatedId); 
            upload.setOriginalFilename(originalName);
            upload.setExtension(ext);
            upload.setUploadPath(path.toString());
            upload.setUploadedFrom(source);

            
            
            // Hash calculation removed (Reverted)
            // upload.setFileHash("0");
            
            uploadRepository.save(upload);

            // Response
            Map<String, String> response = new HashMap<>();
            response.put("filename", finalFilename); 
            response.put("uploadId", generatedId + ext); // Return ID + Ext for frontend detection
            response.put("originalName", originalName);
            response.put("path", path.toString());
            
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            if ("STORAGE_PATH_NOT_CONFIGURED".equals(e.getMessage())) {
                return ResponseEntity.status(503).body(Map.of("error", "STORAGE_PATH_NOT_CONFIGURED"));
            }
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload: " + e.getMessage()));
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload: " + e.getMessage()));
        }
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
            java.util.Optional<com.digitalstudio.app.model.Upload> upload = uploadRepository.findById(uploadId);
            if (upload.isPresent()) {
                String dbPath = upload.get().getUploadPath();
                if (dbPath != null && !dbPath.isEmpty()) {
                     Path path = Paths.get(dbPath);
                     org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());
                     if (resource.exists() || resource.isReadable()) {
                         String contentType = "application/octet-stream";
                         try {
                             contentType = Files.probeContentType(path);
                         } catch (IOException ex) { }

                         return ResponseEntity.ok()
                             .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
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

    @org.springframework.beans.factory.annotation.Autowired
    private com.digitalstudio.app.repository.PhotoOrderRepository photoOrderRepository;

    @PostMapping("/check-availability")
    public ResponseEntity<Map<String, Object>> checkAvailability() {
        // Here we just check existing file paths as stored in DB. 
        // We don't necessarily need getUploadDir() unless we want to validate they are inside it.
        // But the requirement is just checking existence.
        
        int availableCount = 0;
        int missingCount = 0;
        java.util.List<Upload> uploads = uploadRepository.findAll();
        
        for (Upload u : uploads) {
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
            "total", uploads.size()
        ));
    }

    @GetMapping
    public java.util.List<Upload> getAllUploads() {
        java.util.List<Upload> uploads = uploadRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        
        // Fetch all orders to link customers
        java.util.List<PhotoOrder> orders = photoOrderRepository.findAll();
        
        // Map UploadID -> List of Customer IDs
        Map<String, java.util.List<String>> uploadCustomerMap = new HashMap<>();
        
        for (PhotoOrder order : orders) {
            String uId = order.getUploadId();
            if (uId != null && order.getCustomer() != null && order.getCustomer().getId() != null) {
                // Strip extension if present to match Upload ID format (e.g. F231230001.jpg -> F231230001)
                if (uId.contains(".")) {
                    uId = uId.substring(0, uId.lastIndexOf("."));
                }
                uploadCustomerMap.computeIfAbsent(uId, k -> new java.util.ArrayList<>()).add(String.valueOf(order.getCustomer().getId()));
            }
        }
        
        // Populate transient field
        for (Upload upload : uploads) {
            java.util.List<String> ids = uploadCustomerMap.getOrDefault(upload.getUploadId(), new java.util.ArrayList<>());
            upload.setCustomerIds(ids);
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
}
