package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "uploads")
@Data
public class Upload {
    @Id
    private String uploadId; // Format: FYYMMDDNNN

    @Column(nullable = false)
    private String uploadPath;
    private String extension;
    private String originalFilename;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Convert(converter = SourceTypeConverter.class)
    private SourceType uploadedFrom; // e.g., BILL_PAYMENT

    // Hash calculation removed
    // private String fileHash;

    private Boolean isAvailable = true; // True if file exists on disk, False if removed/missing

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "linked_customer_id")
    private Customer linkedCustomer;

    @Column(name = "mark_deleted")
    private Boolean markDeleted = false;

    public boolean isMarkDeleted() {
        return Boolean.TRUE.equals(markDeleted);
    }

    public void setMarkDeleted(boolean markDeleted) {
        this.markDeleted = markDeleted;
    }

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Transient
    private List<String> customerIds;
}
