package com.digitalstudio.app.controller;

import com.digitalstudio.app.dto.PhotoOrderRequest;
import com.digitalstudio.app.model.PhotoOrder;
import com.digitalstudio.app.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5174")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    public ResponseEntity<PhotoOrder> saveOrder(@RequestBody PhotoOrderRequest request) {
        // saveOrder in service handles both create and update based on request.orderId
        // presence
        PhotoOrder saved = orderService.saveOrder(request);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PhotoOrder> updateOrder(@PathVariable UUID id, @RequestBody PhotoOrderRequest request) {
        request.setOrderId(id); // Ensure ID matches path
        PhotoOrder saved = orderService.saveOrder(request);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public org.springframework.data.domain.Page<PhotoOrder> getAllOrders(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean instant,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.getAllOrders(startDate, endDate, search, instant, page, size);
    }

    @PutMapping("/{id}/status")
    public PhotoOrder updateStatus(@PathVariable UUID id, @RequestParam String status) {
        return orderService.updateStatus(id, status);
    }

    @PostMapping("/bulk/status")
    public ResponseEntity<?> bulkUpdateStatus(@RequestBody Map<String, Object> payload) {
        try {
            List<String> idsRaw = (List<String>) payload.get("ids");
            String status = (String) payload.get("status");

            if (idsRaw == null || status == null) {
                return ResponseEntity.badRequest().body("Missing 'ids' or 'status'");
            }

            List<UUID> ids = idsRaw.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            orderService.bulkUpdateStatus(ids, status);
            return ResponseEntity.ok(Collections.singletonMap("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}
