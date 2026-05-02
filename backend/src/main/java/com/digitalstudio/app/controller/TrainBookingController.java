package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.TrainBooking;
import com.digitalstudio.app.service.TrainBookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/train-bookings")
@CrossOrigin(origins = "*")
public class TrainBookingController {

    @Autowired
    private TrainBookingService trainBookingService;

    @GetMapping
    public Page<TrainBooking> getAllBookings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return trainBookingService.getAllBookings(startDate, endDate, search, page, size);
    }

    @GetMapping("/suggestions")
    public java.util.List<TrainBooking> getSuggestions(@RequestParam String mobile) {
        return trainBookingService.getSuggestionsByMobile(mobile);
    }

    @PostMapping
    public TrainBooking createBooking(@RequestBody TrainBooking booking) {
        return trainBookingService.createBooking(booking);
    }

    @GetMapping("/{id}")
    public TrainBooking getBookingById(@PathVariable UUID id) {
        return trainBookingService.getBookingById(id);
    }

    @PatchMapping("/{id}/status")
    public TrainBooking updateStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestParam(required = false) Double profit,
            @RequestParam(required = false) String profitType,
            @RequestParam(required = false) Double finalAmount) {
        return trainBookingService.updateStatus(id, status, profit, profitType, finalAmount);
    }

    @PatchMapping("/{id}")
    public TrainBooking updateBooking(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return trainBookingService.updateBooking(id, updates);
    }
}
