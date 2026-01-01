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

    @PutMapping("/{id}/status")
    public ResponseEntity<PhotoOrder> updateStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(orderService.updateStatus(id, newStatus));
    }

    @PutMapping("/bulk-status")
    public ResponseEntity<?> bulkUpdateStatus(@RequestBody java.util.Map<String, Object> body) {
        System.out.println("DEBUG: bulkUpdateStatus Payload: " + body);
        try {
            List<?> idsRaw = (List<?>) body.get("ids");
            String status = (String) body.get("status");
            
            if (idsRaw == null || idsRaw.isEmpty() || status == null) {
                System.out.println("DEBUG: Missing ids or status");
                return ResponseEntity.badRequest().body("Missing 'ids' or 'status'");
            }
            
            // Safer conversion: Handle Integer, Long, or whatever Number Jackson gives
            List<Long> ids = idsRaw.stream()
                .filter(item -> item instanceof Number)
                .map(item -> ((Number) item).longValue())
                .collect(java.util.stream.Collectors.toList());

            if (ids.isEmpty()) {
                 System.out.println("DEBUG: No valid numeric IDs found");
                 return ResponseEntity.badRequest().body("No valid numeric IDs found");
            }

            System.out.println("DEBUG: Updating IDs: " + ids + " to status: " + status);
            orderService.bulkUpdateStatus(ids, status);
            return ResponseEntity.ok(java.util.Collections.singletonMap("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
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
