package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_delete_queue")
@Data
public class FileDeleteQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String uploadId;

    @Column(nullable = false)
    private LocalDateTime softDeleteTime;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
