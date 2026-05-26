package com.sentinelai.controller;

import com.sentinelai.model.ScanResult;
import com.sentinelai.model.User;
import com.sentinelai.repository.ScanResultRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final ScanResultRepository scanResultRepository;

    public HistoryController(ScanResultRepository scanResultRepository) {
        this.scanResultRepository = scanResultRepository;
    }

    @GetMapping
    public ResponseEntity<?> getHistory(@AuthenticationPrincipal User user) {
        List<ScanResult> results = scanResultRepository.findByUserOrderByScannedAtDesc(user);
        List<Map<String, Object>> history = new ArrayList<>();

        for (ScanResult sr : results) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", sr.getId());
            entry.put("input", sr.getInput());
            entry.put("status", sr.getStatus());
            entry.put("score", sr.getScore());
            entry.put("reason", sr.getReason());
            entry.put("scannedAt", sr.getScannedAt().toString());
            history.add(entry);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", scanResultRepository.countByUser(user));
        stats.put("highRisk", scanResultRepository.countByUserAndStatus(user, "HIGH RISK"));
        stats.put("safe", scanResultRepository.countByUserAndStatus(user, "SAFE"));

        return ResponseEntity.ok(Map.of("history", history, "stats", stats));
    }
}
