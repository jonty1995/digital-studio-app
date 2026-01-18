package com.digitalstudio.app.service;

import com.digitalstudio.app.model.MoneyTransfer;
import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.repository.MoneyTransferRepository;
import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.repository.UploadRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import jakarta.persistence.criteria.Predicate;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MoneyTransferService {

    @Autowired
    private MoneyTransferRepository moneyTransferRepository;

    @Autowired
    private UploadRepository uploadRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private ObjectMapper objectMapper;

    public Page<MoneyTransfer> getAllTransfers(LocalDate startDate, LocalDate endDate,
            String search, List<String> types, int page, int size) {
        Specification<MoneyTransfer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
            }

            if (types != null && !types.isEmpty()) {
                predicates.add(root.get("transferType").in(types));
            }

            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                Predicate customerName = cb.like(cb.lower(root.get("customer").get("name")), likePattern);
                Predicate recipientName = cb.like(cb.lower(root.get("recipientName")), likePattern);
                Predicate upiId = cb.like(cb.lower(root.get("upiId")), likePattern);
                Predicate accountNumber = cb.like(cb.lower(root.get("accountNumber")), likePattern);
                Predicate status = cb.like(cb.lower(root.get("status")), likePattern);
                predicates.add(cb.or(customerName, recipientName, upiId, accountNumber, status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<MoneyTransfer> pageData = moneyTransferRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        for (MoneyTransfer mt : pageData.getContent()) {
            if (mt.getUploadId() != null) {
                String rawId = mt.getUploadId();
                if (rawId.contains(".")) {
                    rawId = rawId.substring(0, rawId.lastIndexOf('.'));
                }
                uploadRepository.findById(rawId).ifPresent(upload -> {
                    mt.setIsFileAvailable(upload.getIsAvailable());
                });
            }
        }

        return pageData;
    }

    public MoneyTransfer createTransfer(MoneyTransfer transfer) {
        if (transfer.getPayment() != null && transfer.getPayment().getPaymentId() == null) {
            transfer.getPayment().setPaymentId(System.currentTimeMillis());
        }

        if (transfer.getId() == null) {
            transfer.setId(System.currentTimeMillis());
        }

        if (transfer.getCustomer() != null) {
            Customer payloadCustomer = transfer.getCustomer();
            if (payloadCustomer.getId() == null) {
                if (payloadCustomer.getMobile() != null && !payloadCustomer.getMobile().isEmpty()) {
                    Customer existing = customerRepository.findByMobile(payloadCustomer.getMobile()).orElse(null);
                    if (existing != null) {
                        transfer.setCustomer(existing);
                    } else {
                        Long newId = customerService.generateNewCustomerId();
                        payloadCustomer.setId(newId);
                        transfer.setCustomer(customerRepository.save(payloadCustomer));
                    }
                } else {
                    Long newId = customerService.generateNewCustomerId();
                    payloadCustomer.setId(newId);
                    transfer.setCustomer(customerRepository.save(payloadCustomer));
                }
            } else {
                transfer.setCustomer(customerRepository.findById(payloadCustomer.getId()).orElseGet(() -> {
                    Long newId = customerService.generateNewCustomerId();
                    payloadCustomer.setId(newId);
                    return customerRepository.save(payloadCustomer);
                }));
            }
        }

        if (transfer.getStatusHistoryJson() == null || transfer.getStatusHistoryJson().isEmpty()) {
            try {
                List<Map<String, Object>> history = new ArrayList<>();
                Map<String, Object> entry = new HashMap<>();
                entry.put("status", transfer.getStatus());
                entry.put("timestamp", java.time.LocalDateTime.now().toString());
                history.add(entry);
                transfer.setStatusHistoryJson(objectMapper.writeValueAsString(history));
            } catch (Exception e) {
                System.err.println("Error initializing money transfer history: " + e.getMessage());
            }
        }

        return moneyTransferRepository.save(transfer);
    }

    public MoneyTransfer updateStatus(Long id, String status) {
        MoneyTransfer transfer = moneyTransferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transfer not found with id: " + id));

        transfer.setStatus(status);

        try {
            List<Map<String, Object>> history;
            if (transfer.getStatusHistoryJson() != null && !transfer.getStatusHistoryJson().isEmpty()) {
                history = objectMapper.readValue(transfer.getStatusHistoryJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<>() {
                        });
            } else {
                history = new ArrayList<>();
            }

            Map<String, Integer> statusOrder = new HashMap<>();
            statusOrder.put("Pending", 0);
            statusOrder.put("Done", 1);
            statusOrder.put("Failed", 1);
            statusOrder.put("Discarded", 2);

            int newStatusIdx = statusOrder.getOrDefault(status, 99);

            history.removeIf(entry -> {
                String s = (String) entry.getOrDefault("status", entry.get("to"));
                int sIdx = statusOrder.getOrDefault(s, 99);
                return sIdx > newStatusIdx;
            });

            history.removeIf(entry -> {
                String entryStatus = (String) entry.getOrDefault("status", entry.get("to"));
                return status.equals(entryStatus);
            });

            Map<String, Object> entry = new HashMap<>();
            entry.put("status", status);
            entry.put("timestamp", java.time.LocalDateTime.now().toString());
            history.add(entry);

            transfer.setStatusHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error updating money transfer status history: " + e.getMessage());
        }

        return moneyTransferRepository.save(transfer);
    }

    public MoneyTransfer updateTransfer(Long id, Map<String, Object> updates) {
        MoneyTransfer existing = moneyTransferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transfer not found with id: " + id));

        if (updates.containsKey("uploadId")) {
            existing.setUploadId((String) updates.get("uploadId"));
        }

        return moneyTransferRepository.save(existing);
    }
}
