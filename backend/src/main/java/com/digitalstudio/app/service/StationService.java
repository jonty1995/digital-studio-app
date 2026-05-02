package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Station;
import com.digitalstudio.app.repository.StationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class StationService {

    private final StationRepository stationRepository;
    private final ConfigurationService configurationService;
    private final ObjectMapper objectMapper;

    private static final String DEFAULT_URL = "https://www.kaggle.com/api/v1/datasets/download/flugeltomar/indian-railway-dataset";

    public List<Station> getAllStations() {
        return stationRepository.findAll();
    }

    public List<Station> searchStations(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return stationRepository.searchStations(query.trim());
    }

    @Transactional
    public void refreshStations() throws Exception {
        log.info("Refreshing station list...");
        
        String curlCommand = configurationService.getValue("STATION_LIST_CURL");
        String url = extractUrl(curlCommand);
        
        if (url == null) {
            log.warn("Could not extract URL from STATION_LIST_CURL. Using default URL.");
            url = DEFAULT_URL;
        }

        log.info("Downloading station dataset from: {}", url);

        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to download dataset. HTTP Status: " + response.statusCode());
        }

        try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(response.body()))) {
            ZipEntry entry;
            boolean found = false;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().equals("list_of_stations.json")) {
                    log.info("Found list_of_stations.json in zip. Parsing...");
                    List<StationDTO> dtos = objectMapper.readValue(zis, new TypeReference<List<StationDTO>>() {});
                    saveStations(dtos);
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw new RuntimeException("list_of_stations.json not found in the downloaded zip.");
            }
        }
        
        log.info("Station list refresh complete.");
    }

    private void saveStations(List<StationDTO> dtos) {
        log.info("Filtering and saving {} stations to database...", dtos.size());
        
        // Use a map to keep only the first occurrence of each station code
        java.util.Map<String, Station> uniqueStations = new java.util.LinkedHashMap<>();
        
        for (StationDTO dto : dtos) {
            String code = dto.getStation_code();
            if (code != null && !code.trim().isEmpty()) {
                uniqueStations.putIfAbsent(code.trim(), Station.builder()
                        .stationCode(code.trim())
                        .stationName(dto.getStation_name() != null ? dto.getStation_name().trim() : "Unknown")
                        .regionCode(dto.getRegion_code() != null ? dto.getRegion_code().trim() : "??")
                        .build());
            }
        }

        stationRepository.deleteAllInBatch();
        stationRepository.saveAll(uniqueStations.values());
        log.info("Saved {} unique stations.", uniqueStations.size());
    }

    private String extractUrl(String curlCommand) {
        if (curlCommand == null || curlCommand.isEmpty()) return null;
        
        // Look for https://...
        Pattern pattern = Pattern.compile("(https?://[^\\s]+)");
        Matcher matcher = pattern.matcher(curlCommand);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    // Helper DTO for JSON parsing
    @lombok.Data
    public static class StationDTO {
        private String station_code;
        private String station_name;
        private String region_code;
    }
}
