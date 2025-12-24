package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "uploads")
public class Uploads {
    @Id
    private Long uploadId;

    private String uploadPath;
    private String extension;
    private String originalFilename;
    
    @Column(nullable = false)
    private Boolean isDeleted = false;
    
    private String uploadedFrom;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
