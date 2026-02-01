package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.PhotoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface PhotoItemRepository extends JpaRepository<PhotoItem, UUID>, JpaSpecificationExecutor<PhotoItem> {
}
