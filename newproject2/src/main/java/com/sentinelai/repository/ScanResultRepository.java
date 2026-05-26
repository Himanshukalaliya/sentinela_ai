package com.sentinelai.repository;

import com.sentinelai.model.ScanResult;
import com.sentinelai.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScanResultRepository extends JpaRepository<ScanResult, Long> {
    List<ScanResult> findByUserOrderByScannedAtDesc(User user);
    long countByUser(User user);
    long countByUserAndStatus(User user, String status);
}
