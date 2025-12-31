package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.model.PhotoOrder;
import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.repository.PhotoOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class OrderService {

    @Autowired
    private PhotoOrderRepository photoOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private com.digitalstudio.app.repository.PaymentRepository paymentRepository;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Autowired
    private CustomerService customerService;

    public PhotoOrder saveOrder(com.digitalstudio.app.dto.PhotoOrderRequest request) {
        // 0. Resolve Order (Edit vs New)
        PhotoOrder order = new PhotoOrder();
        boolean isUpdate = false;
        if (request.getOrderId() != null) {
            java.util.Optional<PhotoOrder> existingOpt = photoOrderRepository.findById(request.getOrderId());
            if (existingOpt.isPresent()) {
                order = existingOpt.get();
                isUpdate = true;
            }
        }

        // 1. Customer
        Customer customer = null;
        if (request.getCustomer() != null) {
            String mobile = request.getCustomer().getMobile();
            String name = request.getCustomer().getName();
            String reqId = request.getCustomer().getId();

            if (mobile != null && !mobile.trim().isEmpty()) {
                java.util.Optional<Customer> existing = customerRepository.findByMobile(mobile);
                if (existing.isPresent()) {
                    customer = existing.get();
                    if (name != null && !name.trim().equals(customer.getName())) {
                         appendHistory(customer, "Modified", "Name updated: " + customer.getName() + " -> " + name);
                         customer.setName(name);
                    }
                } else {
                    customer = new Customer();
                    customer.setMobile(mobile);
                    customer.setName(name);
                    appendHistory(customer, "Created", "Via New Photo Order");
                    try {
                        customer.setId(Long.parseLong(mobile));
                    } catch (NumberFormatException e) {
                        customer.setId(customerService.generateNewCustomerId());
                    }
                }
            } else {
                // No valid mobile, check provided ID
                boolean idHandled = false;
                if (reqId != null && !reqId.trim().isEmpty()) {
                    try {
                        long idVal = Long.parseLong(reqId);
                        java.util.Optional<Customer> existing = customerRepository.findById(idVal);
                        
                        if (existing.isPresent()) {
                            // ID exists: Check for collision (Same Name?)
                            Customer existCust = existing.get();
                            String oldName = existCust.getName() != null ? existCust.getName().trim() : "";
                            String newName = name != null ? name.trim() : "";

                            if (oldName.equalsIgnoreCase(newName)) {
                                // Determine reused
                                customer = existCust;
                            } else {
                                // Collision! Stale ID. Generate NEW.
                                customer = new Customer();
                                customer.setName(name);
                                customer.setId(customerService.generateNewCustomerId());
                            }
                        } else {
                            // ID is free
                            customer = new Customer();
                            customer.setId(idVal);
                            customer.setName(name);
                        }
                        idHandled = true;
                    } catch (NumberFormatException e) {
                        // Invalid format, fall through to generate
                    }
                }
                
                if (!idHandled || customer == null) {
                    customer = new Customer();
                    customer.setName(name);
                    customer.setId(customerService.generateNewCustomerId());
                    appendHistory(customer, "Created", "New Generated ID");
                }
            }
            customer = customerRepository.save(customer);
        }

        // 2. Payment
        com.digitalstudio.app.model.Payment payment;
        if (isUpdate && order.getPayment() != null) {
            payment = order.getPayment();
        } else {
            payment = new com.digitalstudio.app.model.Payment();
            payment.setPaymentId(System.nanoTime()); 
        }

        if (request.getPayment() != null) {
            payment.setTotalAmount(request.getPayment().getTotal());
            payment.setDiscountAmount(request.getPayment().getDiscount());
            payment.setAdvanceAmount(request.getPayment().getAdvance());
            double due = (request.getPayment().getTotal() != null ? request.getPayment().getTotal() : 0) 
                        - (request.getPayment().getDiscount() != null ? request.getPayment().getDiscount() : 0) 
                        - (request.getPayment().getAdvance() != null ? request.getPayment().getAdvance() : 0);
            payment.setDueAmount(due);
            payment.setPaymentMode(request.getPayment().getMode());
            payment = paymentRepository.save(payment);
        }

        // 3. Order
        if (!isUpdate) {
            order.setOrderId(System.currentTimeMillis());
        }
        if (customer != null) order.setCustomer(customer);
        if (payment != null) order.setPayment(payment);

        try {
            order.setItemsJson(objectMapper.writeValueAsString(request.getItems()));
        } catch (Exception e) {
            throw new RuntimeException("Error serializing items", e);
        }

        order.setDescription(request.getDescription());
        
        boolean instant = false;
        if (request.getItems() != null) {
            instant = request.getItems().stream()
                .anyMatch(i -> Boolean.TRUE.equals(i.get("isInstant")));
        }
        order.setIsInstant(instant);

        order.setStatus((payment != null && payment.getDueAmount() <= 0) ? "Completed" : "Pending");
        
        // Map Image/File ID
        // Map Image/File ID
        order.setUploadId(request.getImage());

        return photoOrderRepository.save(order);
    }

    private void appendHistory(Customer customer, String action, String details) {
        try {
            java.util.List<java.util.Map<String, Object>> history;
            if (customer.getEditHistoryJson() != null && !customer.getEditHistoryJson().isEmpty()) {
                history = objectMapper.readValue(customer.getEditHistoryJson(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            } else {
                history = new java.util.ArrayList<>();
            }
            
            java.util.Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("action", action);
            entry.put("details", details);
            entry.put("timestamp", java.time.LocalDateTime.now().toString());
            
            history.add(0, entry); // Add to top
            
            customer.setEditHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error appending history: " + e.getMessage());
        }
    }

    @Autowired
    private com.digitalstudio.app.repository.UploadRepository uploadRepository;

    public org.springframework.data.domain.Page<PhotoOrder> getAllOrders(java.time.LocalDate startDate, java.time.LocalDate endDate, String search, Boolean isInstant, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending());
        org.springframework.data.domain.Page<PhotoOrder> orderPage = photoOrderRepository.findAll(com.digitalstudio.app.repository.specification.OrderSpecification.filterOrders(startDate, endDate, search, isInstant), pageable);
        
        // Dynamic Extension Fix & Original Filename Population
        for (PhotoOrder order : orderPage.getContent()) {
            String currentUploadId = order.getUploadId();
            if (currentUploadId != null) {
                // 1. Determine Raw ID (Strip extension if present for lookup)
                String rawId = currentUploadId;
                if (currentUploadId.contains(".")) {
                    rawId = currentUploadId.substring(0, currentUploadId.lastIndexOf('.'));
                }

                // 2. Lookup Upload
                String finalRawId = rawId; // effective final for lambda
                uploadRepository.findById(finalRawId).ifPresent(upload -> {
                    // Populate Original Filename
                    order.setOriginalFilename(upload.getOriginalFilename());
                    
                    // Fix Extension if missing in Order but present in Upload
                    if (!currentUploadId.contains(".") && upload.getExtension() != null) {
                        order.setUploadId(currentUploadId + upload.getExtension());
                    }
                });
            }
        }
        
        return orderPage;
    }
}
