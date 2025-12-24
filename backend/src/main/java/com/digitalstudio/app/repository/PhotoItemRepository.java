package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.PhotoItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoItemRepository extends JpaRepository<PhotoItem, Long> {
}
