package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByMobile(String mobile);

    List<Customer> findByMobileContaining(String mobile);

    Page<Customer> findByNameContainingIgnoreCaseOrMobileContaining(String name, String mobile, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(c.id) FROM Customer c WHERE c.id BETWEEN :start AND :end")
    Long findMaxIdInRange(@org.springframework.data.repository.query.Param("start") Long start,
            @org.springframework.data.repository.query.Param("end") Long end);
}
