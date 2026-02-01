package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime startDate, LocalDateTime endDate);

    List<AuditLog> findByEntityNameInAndTimestampBetweenOrderByTimestampDesc(List<String> entityNames,
            LocalDateTime startDate, LocalDateTime endDate);
}
