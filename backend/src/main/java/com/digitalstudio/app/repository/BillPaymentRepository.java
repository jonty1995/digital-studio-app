package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.BillPaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BillPaymentRepository
        extends JpaRepository<BillPaymentTransaction, Long>, JpaSpecificationExecutor<BillPaymentTransaction> {

}
