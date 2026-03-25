package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.UserPagePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPagePermissionRepository extends JpaRepository<UserPagePermission, Long> {
    List<UserPagePermission> findByUserId(Long userId);
    Optional<UserPagePermission> findByUserIdAndPagePath(Long userId, String pagePath);
    void deleteByUserId(Long userId);
}
