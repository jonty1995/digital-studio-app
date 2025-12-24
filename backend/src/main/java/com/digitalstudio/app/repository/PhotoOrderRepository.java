package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.PhotoOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhotoOrderRepository extends JpaRepository<PhotoOrder, Long> {
    List<PhotoOrder> findByOrderByCreatedAtDesc();
}
