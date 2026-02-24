package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.model.PhotoOrder;
import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.repository.PhotoOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.digitalstudio.app.dto.PhotoOrderRequest;
import com.digitalstudio.app.model.Payment;
import com.digitalstudio.app.repository.PaymentRepository;
import com.digitalstudio.app.repository.UploadRepository;
import com.digitalstudio.app.repository.specification.OrderSpecification;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.digitalstudio.app.model.FinancialTransaction;

@Service
@Transactional
public class OrderService {

    @Autowired
    private PhotoOrderRepository photoOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private FinancialService financialService;

    public PhotoOrder saveOrder(PhotoOrderRequest request) {
        // 0. Resolve Order (Edit vs New)
        PhotoOrder order = new PhotoOrder();
        boolean isUpdate = false;
        if (request.getOrderId() != null) {
            UUID orderId = request.getOrderId();
            Optional<PhotoOrder> existingOpt = photoOrderRepository.findById(orderId);
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
                Optional<Customer> existing = customerRepository.findByMobile(mobile);
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
                        Optional<Customer> existing = customerRepository.findById(idVal);

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
            if (customer != null) {
                customer = customerRepository.save(customer);
            }
        }

        // 2. Payment
        Payment payment;
        Double oldAdvance = 0.0;
        if (isUpdate && order.getPayment() != null) {
            payment = order.getPayment();
            oldAdvance = payment.getAdvanceAmount() != null ? payment.getAdvanceAmount() : 0.0;
        } else {
            payment = new Payment();
            // ID is now auto-generated by JPA UUID strategy.
        }

        Double oldTotalBasePrice = 0.0;
        if (isUpdate && order.getItemsJson() != null) {
            try {
                List<Map<String, Object>> oldItems = objectMapper.readValue(order.getItemsJson(),
                        new TypeReference<List<Map<String, Object>>>() {
                        });
                oldTotalBasePrice = calculateTotalBasePrice(oldItems);
            } catch (Exception e) {
            }
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
        // ID is now auto-generated by JPA UUID strategy.
        if (customer != null)
            order.setCustomer(customer);
        if (payment != null)
            order.setPayment(payment);

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

        // Status Logic: Prefer Request Status > Auto logic based on Payment
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            order.setStatus(request.getStatus());
        } else {
            // Auto logic: If paid fully, mark completed?
            // CAUTION: This might be legacy behavior.
            // Ideally new orders should be pending unless explicitly completed.
            order.setStatus(
                    (payment != null && payment.getDueAmount() != null && payment.getDueAmount() <= 0) ? "Completed"
                            : "Pending");
        }

        // Map Image/File ID
        order.setUploadId(request.getImage());

        // Initialize Status History if new
        if (!isUpdate) {
            try {
                java.util.List<java.util.Map<String, Object>> history = new java.util.ArrayList<>();
                java.util.Map<String, Object> entry = new java.util.HashMap<>();
                entry.put("status", order.getStatus());
                entry.put("timestamp", LocalDateTime.now().toString());
                history.add(entry);
                order.setStatusHistoryJson(objectMapper.writeValueAsString(history));
            } catch (Exception e) {
                System.err.println("Error initializing status history: " + e.getMessage());
            }
        }

        PhotoOrder savedOrder = photoOrderRepository.save(order);

        // 4. Record Financial Transaction
        // Rule: Record any NEW cash collected (Advance difference or Initial Advance)
        // Profit is realized incrementally once cumulative payments exceed Total Base
        // Price
        if (savedOrder.getPayment() != null) {
            Double newAdvance = savedOrder.getPayment().getAdvanceAmount() != null
                    ? savedOrder.getPayment().getAdvanceAmount()
                    : 0.0;
            Double paymentDiff = newAdvance - oldAdvance;
            Double totalBasePrice = calculateTotalBasePrice(request.getItems());
            Double oldProfitRealized = Math.max(0.0, oldAdvance - oldTotalBasePrice);
            Double newProfitRealized = Math.max(0.0, newAdvance - totalBasePrice);
            Double txnProfit = newProfitRealized - oldProfitRealized;

            if (paymentDiff != 0 || txnProfit != 0) {
                FinancialTransaction txn = new FinancialTransaction();
                txn.setAmount(paymentDiff);
                txn.setProfit(txnProfit);
                txn.setType("CREDIT");
                txn.setCategory("Photo Orders");
                txn.setPaymentMode(
                        savedOrder.getPayment().getPaymentMode() != null ? savedOrder.getPayment().getPaymentMode()
                                : "Cash");

                if (paymentDiff < 0) {
                    txn.setDescription("Adjust Advance");
                } else if (paymentDiff == 0 && txnProfit != 0) {
                    txn.setDescription("Profit Adjustment");
                } else {
                    txn.setDescription(isUpdate ? "Additional Advance" : "Advance");
                }

                txn.setRelatedId(savedOrder.getOrderId().toString());
                financialService.recordTransaction(txn);
            }
        }

        return savedOrder;
    }

    private Double calculateTotalBasePrice(List<Map<String, Object>> items) {
        if (items == null)
            return 0.0;
        double totalBase = 0.0;
        for (Map<String, Object> item : items) {
            try {
                double bp = toDouble(item.get("basePrice"));
                int qty = item.containsKey("quantity") ? ((Number) item.get("quantity")).intValue() : 1;
                totalBase += bp * qty;
            } catch (Exception e) {
                // Ignore parsing errors for individual items
            }
        }
        return totalBase;
    }

    private double toDouble(Object o) {
        if (o == null)
            return 0.0;
        if (o instanceof Number)
            return ((Number) o).doubleValue();
        try {
            return Double.parseDouble(o.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private void appendHistory(Customer customer, String action, String details) {
        try {
            List<Map<String, Object>> history;
            if (customer.getEditHistoryJson() != null && !customer.getEditHistoryJson().isEmpty()) {
                history = objectMapper.readValue(customer.getEditHistoryJson(), new TypeReference<>() {
                });
            } else {
                history = new ArrayList<>();
            }

            Map<String, Object> entry = new HashMap<>();
            entry.put("action", action);
            entry.put("details", details);
            entry.put("timestamp", LocalDateTime.now().toString());

            history.add(0, entry); // Add to top

            customer.setEditHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error appending history: " + e.getMessage());
        }
    }

    @Autowired
    private UploadRepository uploadRepository;

    public org.springframework.data.domain.Page<PhotoOrder> getAllOrders(LocalDate startDate, LocalDate endDate,
            String search, Boolean instant, Boolean regular, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("createdAt").descending());
        org.springframework.data.domain.Page<PhotoOrder> orderPage = photoOrderRepository
                .findAll(OrderSpecification.filterOrders(startDate, endDate, search, instant, regular), pageable);

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

                    // Populate Availability
                    order.setIsFileAvailable(upload.getIsAvailable());

                    // Fix Extension if missing in Order but present in Upload
                    if (!currentUploadId.contains(".") && upload.getExtension() != null) {
                        order.setUploadId(currentUploadId + upload.getExtension());
                    }
                });
            }
        }

        return orderPage;
    }

    public List<String> getRecentFiles(String mobile) {
        // Fetch more candidates to account for filtering
        List<String> candidates = photoOrderRepository.findDistinctRecentUploads(mobile,
                org.springframework.data.domain.PageRequest.of(0, 20));

        List<String> validFiles = new ArrayList<>();
        for (String uploadId : candidates) {
            if (uploadId == null || uploadId.trim().isEmpty())
                continue;

            // Strip extension for ID lookup
            String rawId = uploadId;
            if (uploadId.contains(".")) {
                rawId = uploadId.substring(0, uploadId.lastIndexOf('.'));
            }

            // Check existence and deleted status
            if (uploadRepository.findById(rawId)
                    .map(u -> Boolean.TRUE.equals(u.getIsAvailable()) && !Boolean.TRUE.equals(u.getMarkDeleted()))
                    .orElse(false)) {
                validFiles.add(uploadId);
            }

            if (validFiles.size() >= 5)
                break;
        }
        return validFiles;
    }

    public PhotoOrder updateStatus(UUID orderId, String status) {
        return updateStatus(orderId, status, null);
    }

    public PhotoOrder updateStatus(UUID orderId, String newStatus, Double paymentAmount) {
        PhotoOrder order = photoOrderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String oldStatus = order.getStatus();

        // Validation: Block transition from Pending if no file uploaded
        if ("Pending".equals(oldStatus) && !"Pending".equals(newStatus) &&
                !"Discard".equals(newStatus) && !"Discarded".equals(newStatus)) {
            if (order.getUploadId() == null || order.getUploadId().trim().isEmpty()) {
                throw new RuntimeException("Please upload a file before processing this order");
            }
        }

        // Handle Payment Update if amount provided
        if (paymentAmount != null && paymentAmount > 0) {
            Payment payment = order.getPayment();
            if (payment == null) {
                payment = new Payment();
                payment.setTotalAmount(0.0);
                payment.setDiscountAmount(0.0);
                payment.setAdvanceAmount(0.0);
                payment.setDueAmount(0.0);
                order.setPayment(payment);
            }

            Double currentDue = payment.getDueAmount() != null ? payment.getDueAmount() : 0.0;
            Double prevPaidTotal = payment.getAdvanceAmount() != null ? payment.getAdvanceAmount() : 0.0;

            payment.setDueAmount(Math.max(0.0, currentDue - paymentAmount));
            payment.setAdvanceAmount(prevPaidTotal + paymentAmount);
            paymentRepository.save(payment);

            // Cost-First Profit Realization Calculation
            List<Map<String, Object>> items = new ArrayList<>();
            try {
                if (order.getItemsJson() != null) {
                    items = objectMapper.readValue(order.getItemsJson(), new TypeReference<>() {
                    });
                }
            } catch (Exception e) {
                System.err.println("Error parsing items for profit calculation: " + e.getMessage());
            }

            Double totalBasePrice = calculateTotalBasePrice(items);
            Double oldProfitRealized = Math.max(0.0, prevPaidTotal - totalBasePrice);
            Double newProfitRealized = Math.max(0.0, payment.getAdvanceAmount() - totalBasePrice);
            Double txnProfit = newProfitRealized - oldProfitRealized;

            // Record Financial Transaction
            FinancialTransaction txn = new FinancialTransaction();
            txn.setAmount(paymentAmount);
            txn.setProfit(txnProfit);
            txn.setType("CREDIT");
            txn.setCategory("Photo Orders");
            txn.setPaymentMode(payment.getPaymentMode() != null ? payment.getPaymentMode() : "Cash");
            txn.setDescription("Final Payment");
            txn.setRelatedId(order.getOrderId().toString());
            financialService.recordTransaction(txn);
        }

        // Append to History
        try {
            List<Map<String, Object>> history;
            if (order.getStatusHistoryJson() != null && !order.getStatusHistoryJson().isEmpty()) {
                history = objectMapper.readValue(order.getStatusHistoryJson(), new TypeReference<>() {
                });
            } else {
                history = new ArrayList<>();
            }

            // Define Status Order for Rollback Logic
            Map<String, Integer> statusOrder = new HashMap<>();
            statusOrder.put("Pending", 0);
            statusOrder.put("Processing", 1);
            statusOrder.put("Lab Processing", 1);
            statusOrder.put("Lab Received", 2);
            statusOrder.put("Delivered", 3);
            statusOrder.put("Discard", 4);
            statusOrder.put("Discarded", 4);

            int newStatusIdx = statusOrder.getOrDefault(newStatus, 99);

            // Rollback Logic: Remove statuses that are "future" relative to new status
            // AND capture payments from removed entries for reversal
            final List<Double> revertedPayments = new ArrayList<>();
            history.removeIf(entry -> {
                String s = (String) entry.get("status");
                int sIdx = statusOrder.getOrDefault(s, 99);
                if (sIdx > newStatusIdx) {
                    Object p = entry.get("paymentCollected");
                    if (p != null)
                        revertedPayments.add(toDouble(p));
                    return true;
                }
                return false;
            });

            // Handle Payment Reversal if entries were undone
            for (Double revAmt : revertedPayments) {
                if (revAmt > 0) {
                    Payment p = order.getPayment();
                    if (p != null) {
                        Double currentAdvance = p.getAdvanceAmount() != null ? p.getAdvanceAmount() : 0.0;
                        Double currentDue = p.getDueAmount() != null ? p.getDueAmount() : 0.0;

                        // Calculate items for profit reversal
                        List<Map<String, Object>> itemsList = new ArrayList<>();
                        try {
                            if (order.getItemsJson() != null) {
                                itemsList = objectMapper.readValue(order.getItemsJson(),
                                        new TypeReference<List<Map<String, Object>>>() {
                                        });
                            }
                        } catch (Exception e) {
                        }

                        Double totalBasePrice = calculateTotalBasePrice(itemsList);
                        Double oldProfitRealized = Math.max(0.0, currentAdvance - totalBasePrice);
                        Double newProfitRealized = Math.max(0.0, (currentAdvance - revAmt) - totalBasePrice);
                        Double profitReversal = newProfitRealized - oldProfitRealized;

                        // Create transaction
                        FinancialTransaction txn = new FinancialTransaction();
                        txn.setAmount(-revAmt);
                        txn.setProfit(profitReversal);
                        txn.setType("CREDIT");
                        txn.setCategory("Photo Orders");
                        txn.setPaymentMode(p.getPaymentMode() != null ? p.getPaymentMode() : "Cash");
                        txn.setDescription("Revert");
                        txn.setRelatedId(order.getOrderId().toString());
                        financialService.recordTransaction(txn);

                        // Update Payment Object
                        p.setAdvanceAmount(Math.max(0.0, currentAdvance - revAmt));
                        p.setDueAmount(currentDue + revAmt);
                        paymentRepository.save(p);
                    }
                }
            }

            // Remove existing entry for this status if present (Upsert logic)
            history.removeIf(entry -> newStatus.equals(entry.get("status")));

            Map<String, Object> entry = new HashMap<>();
            entry.put("status", newStatus);
            entry.put("timestamp", LocalDateTime.now().toString());
            if (paymentAmount != null && paymentAmount > 0) {
                entry.put("paymentCollected", paymentAmount);
                entry.put("details", "Payment of ₹" + String.format("%.2f", paymentAmount)
                        + " received during status change to " + newStatus);
            } else {
                entry.put("details", "Status changed to " + newStatus);
            }

            history.add(entry); // Add to end
            order.setStatusHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error updating status history: " + e.getMessage());
        }

        order.setStatus(newStatus);
        return photoOrderRepository.save(order);
    }

    public void bulkUpdateStatus(List<UUID> ids, String newStatus) {
        for (UUID id : ids) {
            try {
                updateStatus(id, newStatus, null);
            } catch (Exception e) {
                System.err.println("Error updating status for order " + id + ": " + e.getMessage());
            }
        }
    }
}
