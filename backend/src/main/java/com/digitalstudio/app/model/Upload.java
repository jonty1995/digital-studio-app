package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

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
    private Boolean isDeleted = false;
    private String uploadedFrom; // e.g., "Photo Order"
    private String fileHash;
    
    private Boolean isAvailable; // True if file exists on disk, False if missing

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Transient
    private java.util.List<String> customerIds;
}
