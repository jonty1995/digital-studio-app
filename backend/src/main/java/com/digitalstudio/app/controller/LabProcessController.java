package com.digitalstudio.app.controller;

import com.digitalstudio.app.service.LabProcessService;
import com.digitalstudio.app.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lab-process")
@CrossOrigin(origins = "*")
public class LabProcessController {

    @Autowired
    private LabProcessService labProcessService;

    @Autowired
    private EmailService emailService;

    @GetMapping("/check-exists")
    public ResponseEntity<Map<String, Boolean>> checkExists(@RequestParam("processDate") String processDate) {
        boolean exists = labProcessService.checkFolderExists(processDate);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @DeleteMapping("/folder")
    public ResponseEntity<?> deleteFolder(@RequestParam("processDate") String processDate) {
        try {
            labProcessService.clearFolder(processDate);
            return ResponseEntity.ok(Map.of("message", "Folder cleared successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to clear folder: " + e.getMessage()));
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateGroup(@RequestParam("groupName") String groupName,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "processDate", required = false) String processDate) {
        try {
            labProcessService.processGroup(groupName, files, processDate);
            return ResponseEntity.ok(Map.of("message", "Group " + groupName + " processed successfully"));
        } catch (RuntimeException e) {
            if ("LAB_PROCESS_PATH_NOT_CONFIGURED".equals(e.getMessage())) {
                return ResponseEntity.status(503).body(Map.of("error", "LAB_PROCESS_PATH_NOT_CONFIGURED"));
            }
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to process group: " + e.getMessage()));
        }
    }

    @Autowired
    private com.digitalstudio.app.repository.LabProcessLogRepository labProcessLogRepository;

    @GetMapping("/open-folder")
    public ResponseEntity<?> openFolder(@RequestParam(value = "processDate", required = false) String processDate,
                                        @RequestParam(value = "logId", required = false) Long logId) {
        try {
            if (logId != null) {
                com.digitalstudio.app.model.LabProcessLog log = labProcessLogRepository.findById(logId).orElse(null);
                if (log != null && log.getSavedPath() != null) {
                    labProcessService.openPath(log.getSavedPath());
                    return ResponseEntity.ok(Map.of("message", "Folder opened successfully from saved path"));
                }
            }
            if (processDate != null && !processDate.isEmpty()) {
                labProcessService.openFolder(processDate);
                return ResponseEntity.ok(Map.of("message", "Folder opened successfully from process date"));
            }
            return ResponseEntity.badRequest().body(Map.of("error", "No valid logId or processDate provided"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/send-email")
    public ResponseEntity<?> sendEmail(@RequestParam("recipient") String recipient,
            @RequestParam("subject") String subject,
            @RequestParam("body") String body,
            @RequestParam("files") MultipartFile[] files) {
        try {
            emailService.sendEmailWithAttachments(recipient, subject, body, files);
            return ResponseEntity.ok(Map.of("message", "Email sent successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to send email: " + e.getMessage()));
        }
    }
}
