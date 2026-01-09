package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.FileDeleteQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FileDeleteQueueRepository extends JpaRepository<FileDeleteQueue, Long> {
    Optional<FileDeleteQueue> findByUploadId(String uploadId);

    void deleteByUploadId(String uploadId);
}
