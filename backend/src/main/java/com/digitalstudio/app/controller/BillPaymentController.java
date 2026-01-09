package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.BillPaymentTransaction;
import com.digitalstudio.app.service.BillPaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bill-payments")
@CrossOrigin(origins = "*")
public class BillPaymentController {

    @Autowired
    private BillPaymentService billPaymentService;

    @GetMapping
    public ResponseEntity<Page<BillPaymentTransaction>> getAllTransactions(
            @RequestParam(required = false) java.time.LocalDate startDate,
            @RequestParam(required = false) java.time.LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) java.util.List<String> types,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(billPaymentService.getAllTransactions(startDate, endDate, search, types, page, size));
    }

    @PostMapping
    public ResponseEntity<BillPaymentTransaction> createTransaction(@RequestBody BillPaymentTransaction transaction) {
        return ResponseEntity.ok(billPaymentService.createTransaction(transaction));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BillPaymentTransaction> updateStatus(@PathVariable Long id, @RequestBody String status) {
        // Status may be sent as plain string or JSON string, ensure it's clean
        String cleanStatus = status.replaceAll("^\"|\"$", "");
        return ResponseEntity.ok(billPaymentService.updateStatus(id, cleanStatus));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BillPaymentTransaction> updateTransaction(@PathVariable Long id,
            @RequestBody java.util.Map<String, Object> updates) {
        return ResponseEntity.ok(billPaymentService.updateTransaction(id, updates));
    }
}
