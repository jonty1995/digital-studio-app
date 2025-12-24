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
    public ResponseEntity<List<PhotoOrder>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }
}
