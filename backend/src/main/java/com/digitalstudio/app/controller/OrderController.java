package com.digitalstudio.app.controller;

import com.digitalstudio.app.dto.PhotoOrderRequest;
import com.digitalstudio.app.model.PhotoOrder;
import com.digitalstudio.app.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    public ResponseEntity<PhotoOrder> createOrder(@RequestBody PhotoOrderRequest request) {
        PhotoOrder saved = orderService.saveOrder(request);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<PhotoOrder>> getAllOrders(
            @RequestParam(required = false) java.time.LocalDate startDate,
            @RequestParam(required = false) java.time.LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "true") boolean instant,
            @RequestParam(defaultValue = "true") boolean regular,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        // Resolve Type Filter
        Boolean isInstant = null;
        if (instant && !regular) {
            isInstant = true;
        } else if (!instant && regular) {
            isInstant = false;
        }
        // If both true or both false, isInstant remains null (no filter)

        return ResponseEntity.ok(orderService.getAllOrders(startDate, endDate, search, isInstant, page, size));
    }
}
