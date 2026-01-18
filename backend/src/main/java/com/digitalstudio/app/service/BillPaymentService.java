package com.digitalstudio.app.service;

import com.digitalstudio.app.model.BillPaymentTransaction;
import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.repository.BillPaymentRepository;
import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.repository.UploadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class BillPaymentService {

    @Autowired
    private BillPaymentRepository billPaymentRepository;

    @Autowired
    private UploadRepository uploadRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerService customerService;

    public Page<BillPaymentTransaction> getAllTransactions(java.time.LocalDate startDate, java.time.LocalDate endDate,
            String search, java.util.List<String> transactionTypes, int page, int size) {
        org.springframework.data.jpa.domain.Specification<BillPaymentTransaction> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
            }

            if (transactionTypes != null && !transactionTypes.isEmpty()) {
                java.util.List<String> validTypes = transactionTypes.stream()
                        .map(String::toUpperCase)
                        .collect(java.util.stream.Collectors.toList());
                predicates.add(root.get("transactionType").as(String.class).in(validTypes));
            }

            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                jakarta.persistence.criteria.Predicate customerName = cb
                        .like(cb.lower(root.get("customer").get("name")), likePattern);
                jakarta.persistence.criteria.Predicate customerMobile = cb.like(root.get("customer").get("mobile"),
                        likePattern);
                jakarta.persistence.criteria.Predicate operator = cb.like(cb.lower(root.get("operator")), likePattern);
                jakarta.persistence.criteria.Predicate billId = cb.like(cb.lower(root.get("billId")), likePattern);
                jakarta.persistence.criteria.Predicate billName = cb.like(cb.lower(root.get("billCustomerName")),
                        likePattern);
                jakarta.persistence.criteria.Predicate status = cb.like(cb.lower(root.get("status")), likePattern);

                predicates.add(cb.or(customerName, customerMobile, operator, billId, billName, status));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<BillPaymentTransaction> pageData = billPaymentRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        // Populate Availability
        for (BillPaymentTransaction txn : pageData.getContent()) {
            if (txn.getUploadId() != null) {
                String rawId = txn.getUploadId();
                if (rawId.contains(".")) {
                    rawId = rawId.substring(0, rawId.lastIndexOf('.'));
                }
                uploadRepository.findById(rawId).ifPresent(upload -> {
                    txn.setIsFileAvailable(upload.getIsAvailable());
                });
            }
        }

        return pageData;
    }

    public BillPaymentTransaction createTransaction(BillPaymentTransaction transaction) {
        // Generate Payment ID manually (Timestamp based)
        if (transaction.getPayment() != null && transaction.getPayment().getPaymentId() == null) {
            transaction.getPayment().setPaymentId(System.currentTimeMillis());
        }

        // Generate Transaction ID manually (Timestamp based) - Matches PhotoOrder logic
        if (transaction.getId() == null) {
            transaction.setId(System.currentTimeMillis());
        }

        if (transaction.getCustomer() != null) {
            Customer payloadCustomer = transaction.getCustomer();
            if (payloadCustomer.getId() == null) {
                // Determine if this is a new customer or existing by mobile
                if (payloadCustomer.getMobile() != null && !payloadCustomer.getMobile().isEmpty()) {
                    Customer existing = customerRepository.findByMobile(payloadCustomer.getMobile()).orElse(null);
                    if (existing != null) {
                        transaction.setCustomer(existing);
                    } else {
                        // Safe to save new customer with Manual ID
                        Long newId = java.util.Objects.requireNonNull(customerService.generateNewCustomerId());
                        payloadCustomer.setId(newId);
                        transaction.setCustomer(customerRepository.save(payloadCustomer));
                    }
                } else {
                    // No ID, No Mobile -> Save as new (likely incomplete but safe for persistence)
                    Long newId = customerService.generateNewCustomerId();
                    payloadCustomer.setId(newId);
                    transaction.setCustomer(customerRepository.save(payloadCustomer));
                }
            } else {
                // ID provided, ensure it's attached
                transaction.setCustomer(customerRepository.findById(payloadCustomer.getId()).orElseGet(() -> {
                    // Fallback: If ID provided but not found (rare), treat as new with new ID
                    Long newId = java.util.Objects.requireNonNull(customerService.generateNewCustomerId());
                    payloadCustomer.setId(newId);
                    return customerRepository.save(payloadCustomer);
                }));
            }
        }

        // Initialize Status History if new
        if (transaction.getStatusHistoryJson() == null || transaction.getStatusHistoryJson().isEmpty()) {
            try {
                java.util.List<java.util.Map<String, Object>> history = new java.util.ArrayList<>();
                java.util.Map<String, Object> entry = new java.util.HashMap<>();
                entry.put("status", transaction.getStatus());
                entry.put("timestamp", java.time.LocalDateTime.now().toString());
                history.add(entry);
                transaction.setStatusHistoryJson(objectMapper.writeValueAsString(history));
            } catch (Exception e) {
                System.err.println("Error initializing bill payment history: " + e.getMessage());
            }
        }

        return billPaymentRepository.save(transaction);
    }

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public BillPaymentTransaction updateStatus(Long id, String status) {
        BillPaymentTransaction transaction = billPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        String oldStatus = transaction.getStatus();
        transaction.setStatus(status);

        // Update History using ObjectMapper for robust JSON handling and Upsert logic
        try {
            java.util.List<java.util.Map<String, Object>> history;
            if (transaction.getStatusHistoryJson() != null && !transaction.getStatusHistoryJson().isEmpty()) {
                history = objectMapper.readValue(transaction.getStatusHistoryJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<>() {
                        });
            } else {
                history = new java.util.ArrayList<>();
            }

            // Define Status Order for Rollback Logic
            java.util.Map<String, Integer> statusOrder = new java.util.HashMap<>();
            statusOrder.put("Pending", 0);
            statusOrder.put("Done", 1);
            statusOrder.put("Failed", 1); // Alternates
            statusOrder.put("Discard", 2);
            statusOrder.put("Discarded", 2);

            int newStatusIdx = statusOrder.getOrDefault(status, 99);

            // Rollback Logic: Remove statuses that are "future" relative to new status
            // Handle both 'status' key (new) and 'to' key (legacy)
            history.removeIf(entry -> {
                String s = (String) entry.getOrDefault("status", entry.get("to"));
                int sIdx = statusOrder.getOrDefault(s, 99);
                return sIdx > newStatusIdx;
            });

            // Remove existing entry for this status if present (Upsert logic)
            // Handle both 'status' key (new) and 'to' key (legacy)
            history.removeIf(entry -> {
                String entryStatus = (String) entry.getOrDefault("status", entry.get("to"));
                return status.equals(entryStatus);
            });

            java.util.Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("status", status); // Using 'status' key to match standard
            entry.put("timestamp", java.time.LocalDateTime.now().toString());

            history.add(entry);

            transaction.setStatusHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error updating bill payment status history: " + e.getMessage());
        }

        return billPaymentRepository.save(transaction);
    }

    public BillPaymentTransaction updateTransaction(Long id, java.util.Map<String, Object> updates) {
        BillPaymentTransaction existing = billPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        if (updates.containsKey("uploadId")) {
            existing.setUploadId((String) updates.get("uploadId"));
        }
        // Allow updating other fields if necessary in future

        return billPaymentRepository.save(existing);
    }
}
