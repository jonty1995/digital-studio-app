package com.digitalstudio.app.controller;

import com.digitalstudio.app.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.digitalstudio.app.model.Customer;

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
    public ResponseEntity<List<Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomers());
    }

    @GetMapping("/sequence")
    public ResponseEntity<Map<String, Integer>> getUniqueSequence(
            @org.springframework.web.bind.annotation.RequestParam String instanceId) {
        int sequence = customerService.getNextSequence(instanceId);
        Map<String, Integer> response = new HashMap<>();
        response.put("sequence", sequence);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<Customer> searchCustomer(@org.springframework.web.bind.annotation.RequestParam String query) {
        return customerService.searchCustomer(query)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<Customer>> getSuggestions(
            @org.springframework.web.bind.annotation.RequestParam String query) {
        return ResponseEntity.ok(customerService.getSuggestions(query));
    }
}
