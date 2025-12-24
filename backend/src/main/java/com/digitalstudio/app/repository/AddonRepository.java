package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.Addon;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddonRepository extends JpaRepository<Addon, Long> {
}
