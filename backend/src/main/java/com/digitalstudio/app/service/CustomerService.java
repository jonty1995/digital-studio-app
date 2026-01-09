package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Customer;
import com.digitalstudio.app.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    private final AtomicLong currentSequence = new AtomicLong(0);
    private final Map<String, Long> instanceReservations = new ConcurrentHashMap<>();
    private volatile long lastPrefix = 0;

    private long getTodayPrefix() {
        LocalDate now = LocalDate.now();
        String yy = String.format("%02d", now.getYear() % 100);
        String mm = String.format("%02d", now.getMonthValue());
        String dd = String.format("%02d", now.getDayOfMonth());
        return Long.parseLong(yy + mm + dd);
    }

    public int getNextSequence(String instanceId) {
        long prefix = getTodayPrefix();

        // Reset if day changed
        if (prefix != lastPrefix) {
            synchronized (this) {
                if (prefix != lastPrefix) {
                    currentSequence.set(0);
                    instanceReservations.clear();
                    lastPrefix = prefix;
                }
            }
        }

        // Sync with DB Max to handle restarts/persistence
        long start = prefix * 1000;
        long end = start + 999;
        Long dbMaxId = customerRepository.findMaxIdInRange(start, end);
        long dbMaxSeq = (dbMaxId != null) ? (dbMaxId % 1000) : 0;

        // Ensure memory counter is ahead of DB
        currentSequence.updateAndGet(curr -> Math.max(curr, dbMaxSeq));

        // Check ID Reservation for this instance
        if (instanceId != null) {
            Long reserved = instanceReservations.get(instanceId);
            if (reserved != null) {
                // If reserved ID is NOT used in DB, keep showing it.
                // If it IS used (saved), we must generate a new one.
                long fullId = start + reserved;
                if (!customerRepository.existsById(fullId)) {
                    return reserved.intValue();
                }
            }
        }

        // Generate new sequence
        long newSeq = currentSequence.incrementAndGet();
        if (instanceId != null) {
            instanceReservations.put(instanceId, newSeq);
        }

        return (int) newSeq;
    }

    public Long generateNewCustomerId() {
        // Fallback or internal generation
        // Ensure state is synced
        getNextSequence(null);

        long prefix = getTodayPrefix();
        long seq = currentSequence.incrementAndGet();
        return (prefix * 1000) + seq;
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Optional<Customer> searchCustomer(String query) {
        if (query == null)
            return Optional.empty();
        query = query.trim();

        // If 10 digits, search ONLY Mobile
        if (query.matches("\\d{10}")) {
            return customerRepository.findByMobile(query);
        }

        // Otherwise search ID
        try {
            long id = Long.parseLong(query);
            return customerRepository.findById(id);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public List<Customer> getSuggestions(String query) {
        if (query == null || query.trim().length() < 3) {
            return List.of();
        }
        return customerRepository.findByMobileContaining(query.trim());
    }
}
