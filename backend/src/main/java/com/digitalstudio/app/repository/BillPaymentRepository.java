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
}
