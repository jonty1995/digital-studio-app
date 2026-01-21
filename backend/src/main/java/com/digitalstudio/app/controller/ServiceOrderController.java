package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.ServiceOrder;
import com.digitalstudio.app.service.ServiceOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
    public ServiceOrder updateStatus(@PathVariable Long id, @RequestBody String status) {
        // Status might be sent as a raw string or JSON. If raw string, it might have
        // quotes.
        String cleanStatus = status.replace("\"", "");
        return serviceOrderService.updateStatus(id, cleanStatus);
    }

    @PutMapping("/{id}")
    public ServiceOrder updateOrder(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return serviceOrderService.updateOrder(id, updates);
    }
}
