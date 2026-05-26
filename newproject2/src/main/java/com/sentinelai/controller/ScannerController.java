package com.sentinelai.controller;

import com.sentinelai.model.ScanResult;
import com.sentinelai.model.User;
import com.sentinelai.repository.ScanResultRepository;
import com.sentinelai.service.SafeBrowsingClient;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ScannerController {

    private final ScanResultRepository scanResultRepository;
    private final SafeBrowsingClient safeBrowsingClient;

    private static final String[] PHISHING_KEYWORDS = {
        "urgent", "suspended", "verify", "account", "login", "bank",
        "confirm identity", "unusual activity", "security alert",
        "reset password", "click here", "sign in"
    };

    private static final String[] LEGIT_DOMAINS = {
        "google.com", "facebook.com", "amazon.com", "microsoft.com",
        "apple.com", "paypal.com", "netflix.com", "linkedin.com",
        "twitter.com", "instagram.com", "github.com", "whatsapp.com"
    };

    public ScannerController(ScanResultRepository scanResultRepository,
                              SafeBrowsingClient safeBrowsingClient) {
        this.scanResultRepository = scanResultRepository;
        this.safeBrowsingClient = safeBrowsingClient;
    }

    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> analyzeLink(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User user) {

        String input = request.get("content");
        if (input == null || input.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Content is required"));
        }

        input = input.trim();
        String detectedDomain = extractDomain(input);
        Map<String, Object> result = analyze(input, detectedDomain);

        // Persist if user is authenticated
        if (user != null) {
            ScanResult scanResult = new ScanResult(
                input.length() > 100 ? input.substring(0, 100) + "..." : input,
                (String) result.get("status"),
                (int) result.get("score"),
                (String) result.get("reason"),
                user
            );
            scanResultRepository.save(scanResult);
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> analyze(String input, String domain) {
        Map<String, Object> result = new HashMap<>();
        int score = 0;
        List<String> reasons = new ArrayList<>();

        String lower = input.toLowerCase();

        // 1. Check for suspicious characters in URL
        if (input.startsWith("http")) {
            if (countChar(input, '@') > 0) {
                score += 30;
                reasons.add("URL contains '@' (used to hide true domain)");
            }
            if (input.contains("//") && input.indexOf("//") != input.lastIndexOf("//")) {
                score += 25;
                reasons.add("Multiple '//' patterns detected");
            }
            if (countChar(input, '-') > 2) {
                score += 15;
                reasons.add("Excessive hyphens in domain");
            }
        }

        // 2. Domain spoofing check
        if (domain != null) {
            boolean isExactMatch = false;
            boolean isSpoofed = false;

            for (String legit : LEGIT_DOMAINS) {
                if (domain.equals(legit)) {
                    isExactMatch = true;
                    break;
                }
                // Check if domain ends with legit domain (subdomain)
                if (domain.endsWith("." + legit)) {
                    isExactMatch = true;
                    break;
                }
            }

            // Spoofing: domain contains a legit name but isn't exactly it
            if (!isExactMatch) {
                for (String legit : LEGIT_DOMAINS) {
                    String baseName = legit.replace(".com", "").replace(".org", "");
                    if (domain.contains(baseName)) {
                        score += 30;
                        reasons.add("Domain contains '" + baseName + "' — possible spoofing");
                        isSpoofed = true;
                        break;
                    }
                }
            }

            // Check for suspicious subdomain patterns
            if (!isSpoofed) {
                String domainLower = domain.toLowerCase();
                if (domainLower.contains("login") || domainLower.contains("verify") || domainLower.contains("secure")) {
                    score += 15;
                    reasons.add("Domain contains security-related keywords");
                }
                // Check for common phishing patterns in domain
                if (domainLower.contains("-")) {
                    score += 10;
                    reasons.add("Hyphenated domain pattern");
                }
            }
        }

        // 3. Keyword analysis
        int keywordCount = 0;
        for (String keyword : PHISHING_KEYWORDS) {
            if (lower.contains(keyword)) {
                keywordCount++;
            }
        }
        score += Math.min(keywordCount * 10, 40);
        if (keywordCount > 2) {
            reasons.add("Multiple phishing keywords detected");
        } else if (keywordCount > 0) {
            reasons.add("Phishing keyword detected");
        }

        // 4. URL-specific patterns
        if (input.startsWith("http")) {
            if (input.contains("@")) {
                score += 25;
                reasons.add("URL uses '@' to hide destination");
            }
            // Count dots in domain
            if (domain != null && countChar(domain, '.') > 2) {
                score += 10;
                reasons.add("Excessive subdomains");
            }
        }

        // 5. Social engineering patterns in text
        if (!input.startsWith("http")) {
            int engPatterns = 0;
            if (lower.contains("click here")) engPatterns++;
            if (lower.contains("act now") || lower.contains("immediately")) engPatterns++;
            if (lower.contains("password") || lower.contains("credit card") || lower.contains("ssn")) engPatterns++;
            if (lower.contains("confirm") && lower.contains("account")) engPatterns++;
            score += Math.min(engPatterns * 10, 20);
            if (engPatterns > 1) {
                reasons.add("Social engineering patterns detected");
            } else if (engPatterns == 1) {
                reasons.add("Social engineering pattern detected");
            }
        }

        // 6. Google Safe Browsing API check (only for URLs)
        String safeBrowsingStatus = "Not checked";
        if (input.startsWith("http")) {
            SafeBrowsingClient.SafeBrowsingResult sbResult =
                safeBrowsingClient.checkUrl(input);
            safeBrowsingStatus = sbResult.getMessage();
            if (sbResult.isThreatFound()) {
                score += 40;
                reasons.add("Google Safe Browsing: " + sbResult.getMessage());
            }
        }

        // Determine final status
        score = Math.min(score, 100);

        if (score >= 50) {
            result.put("status", "HIGH RISK");
        } else if (score >= 20) {
            result.put("status", "SUSPICIOUS");
        } else {
            result.put("status", "SAFE");
        }

        result.put("score", score);
        result.put("reason", reasons.isEmpty() ? "No immediate threats found." : String.join("; ", reasons));
        result.put("domain", domain != null ? domain : "N/A");
        result.put("keywordCount", keywordCount);
        result.put("safeBrowsing", safeBrowsingStatus);
        result.put("safeBrowsingEnabled", safeBrowsingClient.isEnabled());

        return result;
    }

    private String extractDomain(String input) {
        if (!input.startsWith("http")) return null;
        try {
            URI uri = new URI(input);
            String host = uri.getHost();
            if (host != null && host.startsWith("www.")) {
                host = host.substring(4);
            }
            return host;
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private int countChar(String s, char c) {
        int count = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == c) count++;
        }
        return count;
    }
}
