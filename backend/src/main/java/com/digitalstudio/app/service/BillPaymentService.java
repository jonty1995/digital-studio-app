package com.digitalstudio.app.service;

import com.digitalstudio.app.model.BillPaymentTransaction;
import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.repository.BillPaymentRepository;
import com.digitalstudio.app.repository.CustomerRepository;
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

        return billPaymentRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
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

        return billPaymentRepository.save(transaction);
    }

    public BillPaymentTransaction updateStatus(Long id, String status) {
        BillPaymentTransaction transaction = billPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        String oldStatus = transaction.getStatus();
        transaction.setStatus(status);

        // Update History
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                .ofPattern("yyyy-MM-dd HH:mm:ss");
        String timestamp = java.time.LocalDateTime.now().format(formatter);
        String historyEntry = String.format("{\"from\": \"%s\", \"to\": \"%s\", \"timestamp\": \"%s\"}", oldStatus,
                status, timestamp);

        String currentHistory = transaction.getStatusHistoryJson();
        if (currentHistory == null || currentHistory.isEmpty()) {
            transaction.setStatusHistoryJson("[" + historyEntry + "]");
        } else {
            // Append to existing array (remove trailing bracket)
            transaction.setStatusHistoryJson(
                    currentHistory.substring(0, currentHistory.length() - 1) + "," + historyEntry + "]");
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
