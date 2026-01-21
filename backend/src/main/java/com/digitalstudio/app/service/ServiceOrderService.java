package com.digitalstudio.app.service;

import com.digitalstudio.app.model.ServiceOrder;
import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.repository.ServiceOrderRepository;
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

@Service
public class ServiceOrderService {

    @Autowired
    private ServiceOrderRepository serviceOrderRepository;

    @Autowired
    private UploadRepository uploadRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private ObjectMapper objectMapper;

    public Page<ServiceOrder> getAllOrders(LocalDate startDate, LocalDate endDate,
            String search, List<String> services, int page, int size) {
        Specification<ServiceOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
            }

            if (services != null && !services.isEmpty()) {
                predicates.add(root.get("serviceName").in(services));
            }

            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                Predicate customerName = cb.like(cb.lower(root.get("customer").get("name")), likePattern);
                Predicate serviceName = cb.like(cb.lower(root.get("serviceName")), likePattern);
                Predicate description = cb.like(cb.lower(root.get("description")), likePattern);
                Predicate status = cb.like(cb.lower(root.get("status")), likePattern);
                predicates.add(cb.or(customerName, serviceName, description, status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<ServiceOrder> pageData = serviceOrderRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        for (ServiceOrder so : pageData.getContent()) {
            if (so.getUploadIdsJson() != null && !so.getUploadIdsJson().isEmpty()) {
                try {
                    List<String> ids = objectMapper.readValue(so.getUploadIdsJson(),
                            new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {
                            });

                    Map<String, Boolean> availabilityMap = new HashMap<>();
                    for (String id : ids) {
                        String rawId = id;
                        if (rawId.contains(".")) {
                            rawId = rawId.substring(0, rawId.lastIndexOf('.'));
                        }
                        Optional<com.digitalstudio.app.model.Upload> upload = uploadRepository.findById(rawId);
                        availabilityMap.put(id, upload.isPresent() && upload.get().getIsAvailable());
                    }
                    so.setIsFileAvailable(availabilityMap);
                } catch (Exception e) {
                    System.err.println("Error parsing upload IDs: " + e.getMessage());
                }
            }
        }

        return pageData;
    }

    public ServiceOrder createOrder(ServiceOrder order) {
        if (order.getPayment() != null && order.getPayment().getPaymentId() == null) {
            order.getPayment().setPaymentId(System.currentTimeMillis());
        }

        if (order.getId() == null) {
            order.setId(System.currentTimeMillis());
        }

        if (order.getCustomer() != null) {
            Customer payloadCustomer = order.getCustomer();
            if (payloadCustomer.getId() == null) {
                if (payloadCustomer.getMobile() != null && !payloadCustomer.getMobile().isEmpty()) {
                    Customer existing = customerRepository.findByMobile(payloadCustomer.getMobile()).orElse(null);
                    if (existing != null) {
                        order.setCustomer(existing);
                    } else {
                        Long newId = customerService.generateNewCustomerId();
                        payloadCustomer.setId(newId);
                        order.setCustomer(customerRepository.save(payloadCustomer));
                    }
                } else {
                    Long newId = customerService.generateNewCustomerId();
                    payloadCustomer.setId(newId);
                    order.setCustomer(customerRepository.save(payloadCustomer));
                }
            } else {
                order.setCustomer(customerRepository.findById(payloadCustomer.getId()).orElseGet(() -> {
                    Long newId = customerService.generateNewCustomerId();
                    payloadCustomer.setId(newId);
                    return customerRepository.save(payloadCustomer);
                }));
            }
        }

        if (order.getStatusHistoryJson() == null || order.getStatusHistoryJson().isEmpty()) {
            try {
                List<Map<String, Object>> history = new ArrayList<>();
                Map<String, Object> entry = new HashMap<>();
                entry.put("status", order.getStatus());
                entry.put("timestamp", java.time.LocalDateTime.now().toString());
                history.add(entry);
                order.setStatusHistoryJson(objectMapper.writeValueAsString(history));
            } catch (Exception e) {
                System.err.println("Error initializing service order history: " + e.getMessage());
            }
        }

        return serviceOrderRepository.save(order);
    }

    public ServiceOrder updateStatus(Long id, String status) {
        ServiceOrder order = serviceOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service order not found with id: " + id));

        order.setStatus(status);

        try {
            List<Map<String, Object>> history;
            if (order.getStatusHistoryJson() != null && !order.getStatusHistoryJson().isEmpty()) {
                history = objectMapper.readValue(order.getStatusHistoryJson(),
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

            order.setStatusHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error updating service order status history: " + e.getMessage());
        }

        return serviceOrderRepository.save(order);
    }

    public ServiceOrder updateOrder(Long id, Map<String, Object> updates) {
        ServiceOrder existing = serviceOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service order not found with id: " + id));

        // Validation: Only "Pending" orders can be edited for core details
        if (!"Pending".equalsIgnoreCase(existing.getStatus())) {
            // We still allow updating uploadIdsJson even if not pending?
            // User said "user will only able to edit, if status=pending"
            throw new RuntimeException("Only service orders with 'Pending' status can be edited.");
        }

        if (updates.containsKey("serviceName")) {
            existing.setServiceName((String) updates.get("serviceName"));
        }
        if (updates.containsKey("amount")) {
            existing.setAmount(Double.valueOf(updates.get("amount").toString()));
        }
        if (updates.containsKey("description")) {
            existing.setDescription((String) updates.get("description"));
        }
        if (updates.containsKey("uploadIdsJson")) {
            existing.setUploadIdsJson((String) updates.get("uploadIdsJson"));
        }

        return serviceOrderRepository.save(existing);
    }
}
