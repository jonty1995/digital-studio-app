package com.digitalstudio.app.service;

import com.digitalstudio.app.model.TrainBooking;
import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.repository.TrainBookingRepository;
import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.repository.UploadRepository;
import com.digitalstudio.app.model.FinancialTransaction;
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
import java.util.UUID;

@Service
public class TrainBookingService {

    @Autowired
    private TrainBookingRepository trainBookingRepository;

    @Autowired
    private UploadRepository uploadRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FinancialService financialService;

    public Page<TrainBooking> getAllBookings(LocalDate startDate, LocalDate endDate,
            String search, int page, int size) {
        Specification<TrainBooking> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
            }

            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                Predicate customerName = cb.like(cb.lower(root.get("customer").get("name")), likePattern);
                Predicate trainNumber = cb.like(cb.lower(root.get("trainNumber")), likePattern);
                Predicate trainName = cb.like(cb.lower(root.get("trainName")), likePattern);
                Predicate pnr = cb.like(cb.lower(root.get("pnr")), likePattern);
                Predicate description = cb.like(cb.lower(root.get("description")), likePattern);
                Predicate status = cb.like(cb.lower(root.get("status")), likePattern);
                predicates.add(cb.or(customerName, trainNumber, trainName, pnr, description, status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<TrainBooking> pageData = trainBookingRepository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        for (TrainBooking tb : pageData.getContent()) {
            if (tb.getUploadIdsJson() != null && !tb.getUploadIdsJson().isEmpty()) {
                try {
                    List<String> ids = objectMapper.readValue(tb.getUploadIdsJson(),
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
                    tb.setIsFileAvailable(availabilityMap);
                } catch (Exception e) {
                    System.err.println("Error parsing upload IDs: " + e.getMessage());
                }
            }
        }

        return pageData;
    }

    public TrainBooking createBooking(TrainBooking booking) {
        if (booking.getCustomer() != null) {
            Customer payloadCustomer = booking.getCustomer();
            Customer finalCustomer = null;

            if (payloadCustomer.getId() != null) {
                finalCustomer = customerRepository.findById(payloadCustomer.getId()).orElse(null);
            }

            if (finalCustomer == null && payloadCustomer.getMobile() != null
                    && !payloadCustomer.getMobile().trim().isEmpty()) {
                finalCustomer = customerRepository.findByMobile(payloadCustomer.getMobile()).orElse(null);
            }

            if (finalCustomer == null) {
                Customer newCust = new Customer();
                newCust.setMobile(payloadCustomer.getMobile());
                newCust.setName(payloadCustomer.getName());
                if (payloadCustomer.getId() == null) {
                    newCust.setId(customerService.generateNewCustomerId());
                } else {
                    newCust.setId(payloadCustomer.getId());
                }
                finalCustomer = customerRepository.save(newCust);
            } else {
                if (payloadCustomer.getName() != null && !payloadCustomer.getName().isEmpty()) {
                    finalCustomer.setName(payloadCustomer.getName());
                    finalCustomer = customerRepository.save(finalCustomer);
                }
            }
            booking.setCustomer(finalCustomer);
        }

        if (booking.getStatus() == null) {
            booking.setStatus("Pending");
        }

        try {
            java.util.List<java.util.Map<String, Object>> history = new java.util.ArrayList<>();
            java.util.Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("status", booking.getStatus());
            entry.put("timestamp", java.time.LocalDateTime.now().toString());
            history.add(entry);
            booking.setStatusHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error initializing status history: " + e.getMessage());
        }

        TrainBooking saved = trainBookingRepository.save(booking);

        if (saved.getPayment() != null && saved.getPayment().getAdvanceAmount() != null
                && saved.getPayment().getAdvanceAmount() != 0) {
            FinancialTransaction txn = new FinancialTransaction();
            txn.setAmount(saved.getPayment().getAdvanceAmount());
            txn.setProfit(0.0);
            txn.setType("CREDIT");
            txn.setCategory("Train Booking");
            txn.setPaymentMode(
                    saved.getPayment().getPaymentMode() != null ? saved.getPayment().getPaymentMode() : "Cash");
            txn.setDescription(saved.getPayment().getAdvanceAmount() < 0 ? "Revert" : "Advance");
            txn.setRelatedId(saved.getId().toString());
            financialService.recordTransaction(txn);
        }

        return saved;
    }

    public TrainBooking getBookingById(UUID id) {
        return trainBookingRepository.findById(id).orElse(null);
    }

    public TrainBooking updateStatus(UUID bookingId, String newStatus, Double profit, String profitType, Double finalAmount) {
        TrainBooking booking = trainBookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        String oldStatus = booking.getStatus();

        try {
            java.util.List<java.util.Map<String, Object>> history;
            if (booking.getStatusHistoryJson() != null && !booking.getStatusHistoryJson().isEmpty()) {
                history = objectMapper.readValue(booking.getStatusHistoryJson(),
                        new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {
                        });
            } else {
                history = new java.util.ArrayList<>();
            }

            java.util.Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("status", newStatus);
            entry.put("timestamp", java.time.LocalDateTime.now().toString());
            history.add(entry);
            booking.setStatusHistoryJson(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            System.err.println("Error updating status history: " + e.getMessage());
        }

        if ("Done".equalsIgnoreCase(newStatus) && !"Done".equalsIgnoreCase(oldStatus)) {
            com.digitalstudio.app.model.Payment p = booking.getPayment();
            Double advance = (p != null && p.getAdvanceAmount() != null) ? p.getAdvanceAmount() : 0.0;
            Double due = (p != null && p.getDueAmount() != null) ? p.getDueAmount() : 0.0;
            
            if (finalAmount != null) {
                Double newTotal = finalAmount;
                due = newTotal - advance;
                if (p != null) {
                    p.setTotalAmount(newTotal);
                }
            } else if ("Additional".equalsIgnoreCase(profitType) && profit != null) {
                due += profit;
                if (p != null) {
                    p.setTotalAmount(p.getTotalAmount() + profit);
                }
            }

            FinancialTransaction txn = new FinancialTransaction();
            txn.setAmount(due);
            txn.setProfit(profit != null ? profit : 0.0);
            txn.setType("CREDIT");
            txn.setCategory("Train Booking");
            txn.setPaymentMode(p != null ? p.getPaymentMode() : "Cash");
            txn.setDescription("Booking Completed: " + booking.getTrainName() + " (" + booking.getPnr() + ")");
            txn.setRelatedId(booking.getId().toString());
            financialService.recordTransaction(txn);

            if (p != null) {
                p.setAdvanceAmount(advance + due);
                p.setDueAmount(0.0);
            }
        }

        booking.setStatus(newStatus);
        return trainBookingRepository.save(booking);
    }

    public TrainBooking updateBooking(UUID id, Map<String, Object> updates) {
        TrainBooking booking = trainBookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (updates.containsKey("status")) booking.setStatus((String) updates.get("status"));
        if (updates.containsKey("trainNumber")) booking.setTrainNumber((String) updates.get("trainNumber"));
        if (updates.containsKey("trainName")) booking.setTrainName((String) updates.get("trainName"));
        if (updates.containsKey("pnr")) booking.setPnr((String) updates.get("pnr"));
        if (updates.containsKey("fromStation")) booking.setFromStation((String) updates.get("fromStation"));
        if (updates.containsKey("toStation")) booking.setToStation((String) updates.get("toStation"));
        if (updates.containsKey("travelClass")) booking.setTravelClass((String) updates.get("travelClass"));
        if (updates.containsKey("quota")) booking.setQuota((String) updates.get("quota"));
        if (updates.containsKey("passengersJson")) booking.setPassengersJson((String) updates.get("passengersJson"));
        if (updates.containsKey("irctcUser")) booking.setIrctcUser((String) updates.get("irctcUser"));
        if (updates.containsKey("irctcPass")) booking.setIrctcPass((String) updates.get("irctcPass"));
        if (updates.containsKey("contactMobile")) booking.setContactMobile((String) updates.get("contactMobile"));
        if (updates.containsKey("contactEmail")) booking.setContactEmail((String) updates.get("contactEmail"));
        if (updates.containsKey("description")) booking.setDescription((String) updates.get("description"));
        if (updates.containsKey("amount")) booking.setAmount(((Number) updates.get("amount")).doubleValue());
        if (updates.containsKey("basePrice")) booking.setBasePrice(((Number) updates.get("basePrice")).doubleValue());
        if (updates.containsKey("journeyDate")) {
            String jd = (String) updates.get("journeyDate");
            if (jd != null) booking.setJourneyDate(java.time.LocalDateTime.parse(jd));
        }

        if (updates.containsKey("payment")) {
            Object paymentObj = updates.get("payment");
            if (paymentObj instanceof Map) {
                Map<String, Object> payMap = (Map<String, Object>) paymentObj;
                com.digitalstudio.app.model.Payment payment = booking.getPayment();
                Double oldAdvance = (payment != null && payment.getAdvanceAmount() != null) ? payment.getAdvanceAmount() : 0.0;

                if (payment == null) payment = new com.digitalstudio.app.model.Payment();

                if (payMap.containsKey("paymentMode")) payment.setPaymentMode((String) payMap.get("paymentMode"));
                if (payMap.containsKey("totalAmount")) payment.setTotalAmount(((Number) payMap.get("totalAmount")).doubleValue());
                if (payMap.containsKey("advanceAmount")) payment.setAdvanceAmount(((Number) payMap.get("advanceAmount")).doubleValue());
                if (payMap.containsKey("discountAmount")) payment.setDiscountAmount(((Number) payMap.get("discountAmount")).doubleValue());
                if (payMap.containsKey("dueAmount")) payment.setDueAmount(((Number) payMap.get("dueAmount")).doubleValue());

                booking.setPayment(payment);

                Double newAdvance = payment.getAdvanceAmount() != null ? payment.getAdvanceAmount() : 0.0;
                Double paymentDiff = newAdvance - oldAdvance;

                if (paymentDiff != 0) {
                    FinancialTransaction txn = new FinancialTransaction();
                    txn.setAmount(paymentDiff);
                    txn.setProfit(0.0);
                    txn.setType("CREDIT");
                    txn.setCategory("Train Booking");
                    txn.setPaymentMode(payment.getPaymentMode() != null ? payment.getPaymentMode() : "Cash");
                    txn.setDescription(paymentDiff < 0 ? "Adjust Advance" : "Additional Advance");
                    txn.setRelatedId(booking.getId().toString());
                    financialService.recordTransaction(txn);
                }
            }
        }

        if (updates.containsKey("customer")) {
            Object custObj = updates.get("customer");
            if (custObj instanceof Map) {
                Map<String, Object> custMap = (Map<String, Object>) custObj;
                Customer cust = booking.getCustomer();
                if (cust != null && custMap.containsKey("name")) {
                    String newName = (String) custMap.get("name");
                    if (newName != null && !newName.isEmpty() && !newName.equals(cust.getName())) {
                        cust.setName(newName);
                        customerRepository.save(cust);
                    }
                }
            }
        }

        return trainBookingRepository.save(booking);
    }
    public java.util.List<TrainBooking> getSuggestionsByMobile(String mobile) {
        return trainBookingRepository.findRecentByCustomerMobile(mobile, org.springframework.data.domain.PageRequest.of(0, 5));
    }
}
