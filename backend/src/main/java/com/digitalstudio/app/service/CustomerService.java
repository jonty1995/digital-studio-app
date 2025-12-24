package com.digitalstudio.app.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class CustomerService {

    // Using AtomicInteger to ensure thread-safe unique sequence generation
    private final AtomicInteger sequenceRequestCounter = new AtomicInteger(0);
    
    // Store sequence by instance ID to return same number for same instance
    private final Map<String, Integer> instanceSequences = new ConcurrentHashMap<>();

    public int getNextSequence(String instanceId) {
        return instanceSequences.computeIfAbsent(instanceId, k -> sequenceRequestCounter.incrementAndGet());
    }
}
