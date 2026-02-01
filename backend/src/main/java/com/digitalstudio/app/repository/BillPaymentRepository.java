package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.BillPaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface BillPaymentRepository
                extends JpaRepository<BillPaymentTransaction, UUID>, JpaSpecificationExecutor<BillPaymentTransaction> {

        @Modifying
        @Query("UPDATE BillPaymentTransaction b SET b.uploadId = null WHERE b.uploadId = :uploadId")
        void unlinkUpload(String uploadId);

        @Query("SELECT DISTINCT new map(b.billId as billId, b.billCustomerName as billCustomerName, b.operator as operator, b.transactionType as transactionType) FROM BillPaymentTransaction b WHERE b.customer.mobile = :mobile ORDER BY b.createdAt DESC")
        java.util.List<java.util.Map<String, String>> findSuggestions(String mobile);
}
