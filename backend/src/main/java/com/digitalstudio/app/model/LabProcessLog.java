package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "lab_process_logs")
public class LabProcessLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action; // e.g., "Generated", "Mailed"

    private String category; // e.g., "Standard", "Frame", "Lamination", "Both"

    private String recipient; // Only for "Mailed" action

    @Column(columnDefinition = "TEXT")
    private String groupSummary; // e.g., "4x6: 3 files, 5x7: 1 file"

    @Column(columnDefinition = "TEXT")
    private String fileListJson; // List of filenames

    @Column(length = 1000)
    private String savedPath; // The exact absolute path where it was saved at that time

    @CreationTimestamp
    private LocalDateTime timestamp;
}
