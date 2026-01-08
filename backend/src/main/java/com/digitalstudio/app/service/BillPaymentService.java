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

    public Page<BillPaymentTransaction> getAllTransactions(java.time.LocalDate startDate, java.time.LocalDate endDate,
            String search, int page, int size) {
        org.springframework.data.jpa.domain.Specification<BillPaymentTransaction> spec = (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
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
        if (transaction.getCustomer() != null && transaction.getCustomer().getId() != null) {
            Customer existingCustomer = customerRepository.findById(transaction.getCustomer().getId())
                    .orElse(null);
            if (existingCustomer != null) {
                transaction.setCustomer(existingCustomer);
            }
        }
        // If customer is new/transient, we might need to save it first or let cascade
        // handle it if configured.
        // Assuming customer is selected from existing or handled by frontend sending a
        // saved customer.
        // For simplicity, we assume the frontend sends a valid customer object or ID.
        // If the customer object in transaction has no ID but has mobile/name, we
        // should probably save it?
        // Let's stick to the pattern:
        // Check if customer exists by mobile number (if provided)

        if (transaction.getCustomer() != null) {
            Customer payloadCustomer = transaction.getCustomer();
            if (payloadCustomer.getId() == null && payloadCustomer.getMobile() != null) {
                Customer existing = customerRepository.findByMobile(payloadCustomer.getMobile()).orElse(null);
                if (existing != null) {
                    transaction.setCustomer(existing);
                } else {
                    // Save new customer
                    transaction.setCustomer(customerRepository.save(payloadCustomer));
                }
            } else if (payloadCustomer.getId() != null) {
                // Ensure it's attached
                transaction.setCustomer(customerRepository.findById(payloadCustomer.getId()).orElse(payloadCustomer));
            }
        }

        return billPaymentRepository.save(transaction);
    }
}
