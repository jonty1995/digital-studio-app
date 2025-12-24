package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.BillPaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<BillPaymentTransaction, Long> {
}
