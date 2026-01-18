package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.MoneyTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface MoneyTransferRepository
        extends JpaRepository<MoneyTransfer, Long>, JpaSpecificationExecutor<MoneyTransfer> {

    @Modifying
    @Query("UPDATE MoneyTransfer m SET m.uploadId = null WHERE m.uploadId = :uploadId")
    void unlinkUpload(String uploadId);
}
