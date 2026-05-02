package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.ServiceOrder;
import com.digitalstudio.app.service.ServiceOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/service-orders")
public class ServiceOrderController {

    @Autowired
    private ServiceOrderService serviceOrderService;

    @GetMapping
    public Page<ServiceOrder> getAllOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> services,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return serviceOrderService.getAllOrders(startDate, endDate, search, services, page, size);
    }

    @PostMapping
    public ServiceOrder createOrder(@RequestBody ServiceOrder order) {
        return serviceOrderService.createOrder(order);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ServiceOrder> updateStatus(@PathVariable UUID id, @RequestBody String status,
            @RequestParam(required = false) Double profit,
            @RequestParam(required = false) String profitType,
            @RequestParam(required = false) Double finalAmount) {
        String cleanStatus = status.replaceAll("^\"|\"$", "");
        return ResponseEntity.ok(serviceOrderService.updateStatus(id, cleanStatus, profit, profitType, finalAmount));
    }

    @PutMapping("/{id}")
    public ServiceOrder updateOrder(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return serviceOrderService.updateOrder(id, updates);
    }
}
