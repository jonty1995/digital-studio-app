package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.Upload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadRepository extends JpaRepository<Upload, String> {

    
    @org.springframework.data.jpa.repository.Query("SELECT MAX(u.uploadId) FROM Upload u WHERE u.uploadId LIKE :prefix%")
    String findMaxUploadIdByPrefix(@org.springframework.data.repository.query.Param("prefix") String prefix);
}
