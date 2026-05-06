package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Data
@Table(name = "train_bookings")
public class TrainBooking {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "customer_id", columnDefinition = "BIGINT")
    private Customer customer;

    private String trainNumber;
    private String trainName;
    private String pnr;
    private String fromStation;
    private String toStation;
    private LocalDateTime journeyDate;
    private String travelClass;
    private String quota; // GN, TQ, LD, SS, HP
    
    @Column(columnDefinition = "TEXT")
    private String passengersJson; // List of passengers with Name, Gender, Age, Food, Berth/Seat Option

    private String irctcUser;
    private String irctcPass;
    private String contactMobile;
    private String contactEmail;

    private Double amount; // Customer Price (Total)
    private Double basePrice; // Ticket Cost
    
    @Column(columnDefinition = "TEXT")
    private String description;

    private String bookedBy; // Self, Agent

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private String status; // Pending, Done, Failed, Discarded, Cancelled

    @Column(columnDefinition = "TEXT")
    private String statusHistoryJson;

    @Column(columnDefinition = "TEXT", name = "upload_id")
    private String uploadIdsJson; // Multiple document files

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Transient
    private Map<String, Boolean> isFileAvailable;
}
