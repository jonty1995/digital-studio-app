package com.digitalstudio.app.controller;

import com.digitalstudio.app.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "http://localhost:5173") // Allow frontend access
public class CustomerController {

    private final CustomerService customerService;

    @Autowired
    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public ResponseEntity<java.util.List<com.digitalstudio.app.model.Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomers());
    }

    @GetMapping("/sequence")
    public ResponseEntity<Map<String, Integer>> getUniqueSequence(@org.springframework.web.bind.annotation.RequestParam String instanceId) {
        int sequence = customerService.getNextSequence(instanceId);
        Map<String, Integer> response = new HashMap<>();
        response.put("sequence", sequence);
        return ResponseEntity.ok(response);
    }
}
