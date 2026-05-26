package com.sentinelai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class SafeBrowsingClient {

    private final String apiKey;
    private final RestTemplate restTemplate;

    private static final String API_URL =
        "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=";

    public SafeBrowsingClient(@Value("${safebrowsing.api.key:}") String apiKey) {
        this.apiKey = apiKey;
        this.restTemplate = new RestTemplate();
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.equals("YOUR_API_KEY_HERE");
    }

    public SafeBrowsingResult checkUrl(String url) {
        if (!isEnabled()) {
            return new SafeBrowsingResult(false, "API not configured");
        }

        try {
            Map<String, Object> requestBody = new HashMap<>();

            Map<String, Object> client = new HashMap<>();
            client.put("clientId", "sentinelai");
            client.put("clientVersion", "1.0.0");
            requestBody.put("client", client);

            Map<String, Object> threatInfo = new HashMap<>();
            threatInfo.put("threatTypes", List.of(
                "MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION"
            ));
            threatInfo.put("platformTypes", List.of("ANY_PLATFORM"));
            threatInfo.put("threatEntryTypes", List.of("URL"));
            threatInfo.put("threatEntries", List.of(Map.of("url", url)));
            requestBody.put("threatInfo", threatInfo);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                API_URL + apiKey, requestBody, Map.class);

            if (response != null && response.containsKey("matches")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> matches =
                    (List<Map<String, Object>>) response.get("matches");
                if (matches != null && !matches.isEmpty()) {
                    List<String> threats = new ArrayList<>();
                    for (Map<String, Object> match : matches) {
                        String type = (String) match.get("threatType");
                        if (type != null) threats.add(type);
                    }
                    return new SafeBrowsingResult(true,
                        "Flagged: " + String.join(", ", threats));
                }
            }

            return new SafeBrowsingResult(false, "No threats detected");

        } catch (Exception e) {
            return new SafeBrowsingResult(false, "API check failed: " + e.getMessage());
        }
    }

    public static class SafeBrowsingResult {
        private final boolean threatFound;
        private final String message;

        public SafeBrowsingResult(boolean threatFound, String message) {
            this.threatFound = threatFound;
            this.message = message;
        }

        public boolean isThreatFound() { return threatFound; }
        public String getMessage() { return message; }
    }
}
