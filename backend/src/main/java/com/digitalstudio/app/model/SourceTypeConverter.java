package com.digitalstudio.app.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SourceTypeConverter implements AttributeConverter<SourceType, String> {

    @Override
    public String convertToDatabaseColumn(SourceType attribute) {
        if (attribute == null) {
            return null;
        }
        // Save as Enum Name (Standard)
        return attribute.name();
    }

    @Override
    public SourceType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }

        // 1. Try Enum Name first (Fast)
        try {
            return SourceType.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            // Not a direct match
        }

        // 2. Try Display Name Match
        for (SourceType type : SourceType.values()) {
            if (type.getDisplayName().equalsIgnoreCase(dbData)) {
                return type;
            }
        }

        // 3. Try Legacy/Partial Matches
        if (dbData.equalsIgnoreCase("Photo Order")) {
            return SourceType.PHOTO_ORDERS;
        }

        // Add other explicit legacy mappings if needed

        // Fallback: Return null or default?
        // Returning null might be safer than crashing, but better to log or handle?
        // For now, return null to avoid 500 error, effectively treating unknown as null
        // source.
        return null;
    }
}
