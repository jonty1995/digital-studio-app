package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.MoneyTransfer;
import com.digitalstudio.app.service.MoneyTransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/money-transfers")
@CrossOrigin(origins = "*")
public class MoneyTransferController {

    @Autowired
    private MoneyTransferService moneyTransferService;

    @GetMapping
    public ResponseEntity<Page<MoneyTransfer>> getAllTransfers(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> types,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(moneyTransferService.getAllTransfers(startDate, endDate, search, types, page, size));
    }

    @PostMapping
    public ResponseEntity<MoneyTransfer> createTransfer(@RequestBody MoneyTransfer transfer) {
        return ResponseEntity.ok(moneyTransferService.createTransfer(transfer));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MoneyTransfer> updateStatus(@PathVariable UUID id, @RequestBody String status) {
        String cleanStatus = status.replaceAll("^\"|\"$", "");
        return ResponseEntity.ok(moneyTransferService.updateStatus(id, cleanStatus));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MoneyTransfer> updateTransfer(@PathVariable UUID id,
            @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(moneyTransferService.updateTransfer(id, updates));
    }
}
