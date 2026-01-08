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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(billPaymentService.getAllTransactions(startDate, endDate, search, page, size));
    }

    @PostMapping
    public ResponseEntity<BillPaymentTransaction> createTransaction(@RequestBody BillPaymentTransaction transaction) {
        return ResponseEntity.ok(billPaymentService.createTransaction(transaction));
    }
}
