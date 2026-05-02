package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Train;
import com.digitalstudio.app.repository.TrainRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrainService {

    private final TrainRepository trainRepository;
    private final ConfigurationService configurationService;

    private static final String DEFAULT_URL = "https://www.kaggle.com/api/v1/datasets/download/dnyaneshyeole/indian-trains";

    public List<Train> getAllTrains() {
        return trainRepository.findAll();
    }

    public List<Train> searchTrains(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return trainRepository.searchTrains(query.trim());
    }

    @Transactional
    public void refreshTrains() throws Exception {
        log.info("Refreshing train list...");
        
        String curlCommand = configurationService.getValue("TRAIN_LIST_CURL");
        String url = extractUrl(curlCommand);
        
        if (url == null) {
            log.warn("Could not extract URL from TRAIN_LIST_CURL. Using default URL.");
            url = DEFAULT_URL;
        }

        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to download train dataset. HTTP Status: " + response.statusCode());
        }

        try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(response.body()))) {
            ZipEntry entry;
            boolean found = false;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().equals("trains.csv")) {
                    log.info("Found trains.csv in zip. Parsing...");
                    parseAndSaveTrains(zis);
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw new RuntimeException("trains.csv not found in the downloaded zip.");
            }
        }
        
        log.info("Train list refresh complete.");
    }

    private void parseAndSaveTrains(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
        String header = reader.readLine();
        log.info("CSV Header: {}", header);

        Map<String, Train> uniqueTrains = new LinkedHashMap<>();
        String line;
        
        // Regex to split CSV handling quotes
        Pattern csvPattern = Pattern.compile(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

        while ((line = reader.readLine()) != null) {
            if (line.trim().isEmpty()) continue;
            
            String[] cols = csvPattern.split(line, -1);
            if (cols.length < 5) continue;

            // Header: ,train_name,train_number,source,destination,distance,total_time,departure,arrival
            // Index 0: index
            // Index 1: train_name
            // Index 2: train_number
            // Index 3: source
            // Index 4: destination
            
            String name = clean(cols[1]);
            String number = clean(cols[2]);
            String src = clean(cols[3]);
            String dest = clean(cols[4]);

            if (number != null && !number.isEmpty()) {
                uniqueTrains.putIfAbsent(number, Train.builder()
                        .trainNumber(number)
                        .trainName(name)
                        .source(src)
                        .destination(dest)
                        .build());
            }
        }

        log.info("Filtered and saving {} unique trains...", uniqueTrains.size());
        trainRepository.deleteAllInBatch();
        trainRepository.saveAll(uniqueTrains.values());
    }

    private String clean(String val) {
        if (val == null) return "";
        val = val.trim();
        if (val.startsWith("\"") && val.endsWith("\"")) {
            val = val.substring(1, val.length() - 1).replace("\"\"", "\"");
        }
        return val.trim();
    }

    private String extractUrl(String curlCommand) {
        if (curlCommand == null || curlCommand.isEmpty()) return null;
        Pattern pattern = Pattern.compile("(https?://[^\\s]+)");
        Matcher matcher = pattern.matcher(curlCommand);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}
