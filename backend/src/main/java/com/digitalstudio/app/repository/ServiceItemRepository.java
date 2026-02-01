package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, UUID> {
}
