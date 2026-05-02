package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.TrainBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TrainBookingRepository extends JpaRepository<TrainBooking, UUID>, JpaSpecificationExecutor<TrainBooking> {
    @org.springframework.data.jpa.repository.Query("SELECT b FROM TrainBooking b WHERE b.customer.mobile = :mobile ORDER BY b.createdAt DESC")
    java.util.List<TrainBooking> findRecentByCustomerMobile(@org.springframework.data.repository.query.Param("mobile") String mobile, org.springframework.data.domain.Pageable pageable);
}
