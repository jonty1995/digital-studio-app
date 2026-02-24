package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.CreditCard;
import com.digitalstudio.app.model.FinancialTransaction;
import com.digitalstudio.app.service.FinancialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/financial")
@CrossOrigin(origins = "*")
public class FinancialController {

    @Autowired
    private FinancialService financialService;

    // Credit Cards
    @GetMapping("/cards")
    public List<CreditCard> getAllCards() {
        return financialService.getAllCards();
    }

    @PostMapping("/cards")
    public CreditCard saveCard(@RequestBody CreditCard card) {
        return financialService.saveCard(card);
    }

    @DeleteMapping("/cards/{id}")
    public void deleteCard(@PathVariable UUID id) {
        financialService.deleteCard(id);
    }

    @PostMapping("/cards/{id}/pay")
    public org.springframework.http.ResponseEntity<Void> markCardAsPaid(@PathVariable UUID id) {
        financialService.markAsPaid(id);
        return org.springframework.http.ResponseEntity.ok().build();
    }

    @GetMapping("/cards/{id}/unbilled")
    public Double getUnbilledAmount(@PathVariable UUID id) {
        return financialService.getUnbilledAmount(id);
    }

    // Transactions
    @GetMapping("/transactions")
    public Page<FinancialTransaction> getTransactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String paymentMode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());

        // Specification building logic
        org.springframework.data.jpa.domain.Specification<FinancialTransaction> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endDate.atTime(23, 59, 59)));
            }
            if (type != null && !type.isEmpty()) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (category != null && !category.isEmpty()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (paymentMode != null && !paymentMode.isEmpty()) {
                predicates.add(cb.equal(root.get("paymentMode"), paymentMode));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return financialService.getTransactions(spec, pageable);
    }

    @PostMapping("/transactions")
    public FinancialTransaction recordTransaction(@RequestBody FinancialTransaction txn) {
        return financialService.recordTransaction(txn);
    }

    @GetMapping("/summary")
    public java.util.Map<String, Double> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String paymentMode) {

        org.springframework.data.jpa.domain.Specification<FinancialTransaction> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endDate.atTime(23, 59, 59)));
            }
            if (type != null && !type.isEmpty()) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (category != null && !category.isEmpty()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (paymentMode != null && !paymentMode.isEmpty()) {
                predicates.add(cb.equal(root.get("paymentMode"), paymentMode));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return financialService.getSummary(spec);
    }

    @PutMapping("/transactions/{id}/link-card")
    public FinancialTransaction linkToCard(@PathVariable UUID id, @RequestParam(required = false) UUID cardId) {
        return financialService.linkTransactionToCard(id, cardId);
    }
}
