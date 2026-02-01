package com.digitalstudio.app.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class PhotoOrderRequest {
    private java.util.UUID orderId;
    private CustomerDTO customer;
    private List<Map<String, Object>> items; // Keep as generic map or define ItemDTO
    private String description;
    private PaymentDTO payment;
    private String image; // Base64 or ID? Frontend sends object or null? PhotoOrderModal line 50 sends
                          // `image`.
    private String status; // Allow explicit status setting (e.g. from Split)

    @Data
    public static class CustomerDTO {
        private String id; // Might be "CUST001" or similar
        private String name;
        private String mobile;
    }

    @Data
    public static class PaymentDTO {
        private String mode;
        private Double total;
        private Double discount;
        private Double advance;
        // due is calculated
    }
}
