package com.digitalstudio.app.model;

public enum SourceType {
    PHOTO_ORDERS("Photo Orders"),
    UPLOADS("Uploads"),
    BILL_PAYMENT("Bill Payment"),
    MONEY_TRANSFER("Money Transfer"),
    SERVICE("Service");

    private final String displayName;

    SourceType(String displayName) {
        this.displayName = displayName;
    }

    @com.fasterxml.jackson.annotation.JsonValue
    public String getDisplayName() {
        return displayName;
    }

    public static SourceType fromString(String text) {
        for (SourceType b : SourceType.values()) {
            if (b.displayName.equalsIgnoreCase(text)) {
                return b;
            }
        }
        return null; // Or generic / default
    }
}
