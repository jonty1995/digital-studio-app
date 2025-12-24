package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "photo_items")
public class PhotoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Double regularBasePrice;
    private Double regularPrice;
    private Double instantBasePrice;
    private Double instantPrice;

    @Column(columnDefinition = "TEXT")
    private String addonCombinations; // JSON
}
