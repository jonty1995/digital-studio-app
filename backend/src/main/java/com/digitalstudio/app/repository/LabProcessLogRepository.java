package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.LabProcessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabProcessLogRepository extends JpaRepository<LabProcessLog, Long> {
    List<LabProcessLog> findAllByOrderByTimestampDesc();
}
