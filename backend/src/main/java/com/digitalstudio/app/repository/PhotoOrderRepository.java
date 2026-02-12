package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.PhotoOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhotoOrderRepository extends JpaRepository<PhotoOrder, java.util.UUID>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<PhotoOrder> {
    List<PhotoOrder> findByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT p.uploadId FROM PhotoOrder p WHERE p.customer.mobile = :mobile AND p.uploadId IS NOT NULL ORDER BY p.uploadId DESC")
    List<String> findDistinctRecentUploads(String mobile, org.springframework.data.domain.Pageable pageable);

    @Modifying
    @Query("UPDATE PhotoOrder p SET p.uploadId = null WHERE p.uploadId = :uploadId")
    void unlinkUpload(String uploadId);
}
