package com.digitalstudio.app.controller;

import com.digitalstudio.app.repository.CustomerRepository;
import com.digitalstudio.app.repository.PaymentRepository;
import com.digitalstudio.app.repository.PhotoOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@CrossOrigin(origins = "*")
public class ResetController {

    @Autowired
    private PhotoOrderRepository photoOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @DeleteMapping("/reset")
    public ResponseEntity<String> resetData() {
        try {
            // Delete all orders (This handles payments usually via cascade or we delete separately)
            photoOrderRepository.deleteAll();
            
            // Delete all payments explicitly if needed (safe to call even if empty)
            paymentRepository.deleteAll();
            
            // Delete all customers
            customerRepository.deleteAll();
            
            return ResponseEntity.ok("Data Reset Successful");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error resetting data: " + e.getMessage());
        }
    }
}
