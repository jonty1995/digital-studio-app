package com.digitalstudio.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import com.digitalstudio.app.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/database")
@PreAuthorize("hasRole('ADMIN')")
public class DatabaseAdminController {

    @Autowired private PhotoOrderRepository photoOrderRepository;
    @Autowired private ServiceOrderRepository serviceOrderRepository;
    @Autowired private BillPaymentRepository billPaymentRepository;
    @Autowired private MoneyTransferRepository moneyTransferRepository;
    @Autowired private FinancialTransactionRepository financialTransactionRepository;
    @Autowired private UploadRepository uploadRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private LabProcessLogRepository labProcessLogRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @PostMapping("/clear/{table}")
    @Transactional
    public ResponseEntity<?> clearTable(@PathVariable String table, 
                                      @RequestBody Map<String, String> body,
                                      @org.springframework.security.core.annotation.AuthenticationPrincipal com.digitalstudio.app.security.CustomUserDetails userDetails) {
        String password = body != null ? body.get("password") : null;
        
        try {
            // 1. Get Security Context
            if (userDetails == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated."));
            }

            // 2. Validate Password
            boolean authenticated = false;
            com.digitalstudio.app.model.User adminUser = userRepository.findByUsernameIgnoreCase(userDetails.getUsername()).orElse(null);
            if (adminUser != null && password != null && passwordEncoder.matches(password, adminUser.getPassword())) {
                authenticated = true;
            }

            if (!authenticated) {
                return ResponseEntity.status(403).body(Map.of("error", "Incorrect admin password. Deletion aborted."));
            }

            // 3. Map table name to actual DB table name
            String dbTable;
            switch (table.toLowerCase()) {
                case "photo_orders": dbTable = "photo_orders"; break;
                case "service_orders": dbTable = "service_orders"; break;
                case "bill_payments": dbTable = "bill_payment_transactions"; break;
                case "money_transfers": dbTable = "money_transfers"; break;
                case "train_bookings": dbTable = "train_bookings"; break;
                case "financial_transactions": dbTable = "financial_transactions"; break;
                case "uploads": dbTable = "uploads"; break;
                case "customers": dbTable = "customers"; break;
                case "audit_logs": dbTable = "audit_log"; break;
                case "lab_process_logs": dbTable = "lab_process_logs"; break;
                case "payments": dbTable = "payments"; break;
                default: return ResponseEntity.badRequest().body(Map.of("error", "Unknown table: " + table));
            }

            // 4. Force Delete with constraint bypassing (Ensures success regardless of DB state)
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
            try {
                entityManager.createNativeQuery("DELETE FROM " + dbTable).executeUpdate();
            } finally {
                entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully cleared " + table
            ));

        } catch (Throwable t) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal Database Error",
                "details", t.getMessage() != null ? t.getMessage() : t.toString()
            ));
        }
    }
}
