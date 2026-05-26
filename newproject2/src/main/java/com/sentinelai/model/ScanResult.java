package com.sentinelai.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_results")
public class ScanResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String input;

    @Column(nullable = false)
    private String status;

    private int score;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime scannedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public ScanResult() {}

    public ScanResult(String input, String status, int score, String reason, User user) {
        this.input = input;
        this.status = status;
        this.score = score;
        this.reason = reason;
        this.user = user;
        this.scannedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getInput() { return input; }
    public void setInput(String input) { this.input = input; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public LocalDateTime getScannedAt() { return scannedAt; }
    public void setScannedAt(LocalDateTime scannedAt) { this.scannedAt = scannedAt; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
