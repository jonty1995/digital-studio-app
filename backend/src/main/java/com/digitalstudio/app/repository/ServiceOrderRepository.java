package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceOrderRepository
        extends JpaRepository<ServiceOrder, Long>, JpaSpecificationExecutor<ServiceOrder> {
}
