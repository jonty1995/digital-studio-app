package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.MoneyTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.List;

@Repository
public interface MoneyTransferRepository
        extends JpaRepository<MoneyTransfer, UUID>, JpaSpecificationExecutor<MoneyTransfer> {

    @Query("SELECT DISTINCT new map(" +
            "m.recipientName as recipientName, " +
            "m.accountNumber as accountNumber, " +
            "m.bankName as bankName, " +
            "m.ifscCode as ifscCode, " +
            "m.transferType as transferType) " +
            "FROM MoneyTransfer m " +
            "WHERE m.customer.mobile = :mobile " +
            "ORDER BY m.recipientName ASC")
    List<java.util.Map<String, Object>> findSuggestions(String mobile);

    @Modifying
    @Query("UPDATE MoneyTransfer m SET m.uploadId = null WHERE m.uploadId = :uploadId")
    void unlinkUpload(String uploadId);
}
