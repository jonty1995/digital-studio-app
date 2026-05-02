package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "stations", indexes = {
    @Index(name = "idx_station_code", columnList = "stationCode"),
    @Index(name = "idx_station_name", columnList = "stationName")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Station {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String stationCode;

    private String stationName;

    private String regionCode;
}
