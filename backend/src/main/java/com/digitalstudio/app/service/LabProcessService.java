package com.digitalstudio.app.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class LabProcessService {

    @Autowired
    private ConfigurationService configurationService;

    @org.springframework.beans.factory.annotation.Value("${app.lab.path:}")
    private String propLabPath;

    private String getBasePath() {
        if (propLabPath != null && !propLabPath.trim().isEmpty()) {
            return propLabPath;
        }
        throw new RuntimeException("LAB_PROCESS_PATH_NOT_CONFIGURED_IN_PROPERTIES");
    }

    public boolean checkFolderExists(String processDate) {
        String basePath = getBasePath();
        if (basePath == null || basePath.trim().isEmpty()) {
            return false;
        }

        String dateFolder = formatDate(processDate);
        Path datePath = Paths.get(basePath).resolve(dateFolder);
        return Files.exists(datePath);
    }

    public void clearFolder(String processDate) throws IOException {
        String basePath = getBasePath();
        if (basePath == null || basePath.trim().isEmpty()) {
            return;
        }

        String dateFolder = formatDate(processDate);
        Path datePath = Paths.get(basePath).resolve(dateFolder);
        deleteDirectory(datePath);
    }

    private String formatDate(String processDate) {
        if (processDate != null && !processDate.trim().isEmpty()) {
            try {
                java.time.LocalDate localDate = java.time.LocalDate.parse(processDate);
                return localDate.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } catch (Exception e) {
                return processDate;
            }
        } else {
            return java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"));
        }
    }

    public void processGroup(String groupName, List<MultipartFile> files, String processDate)
            throws IOException {
        String basePath = getBasePath();
        if (basePath == null || basePath.trim().isEmpty()) {
            throw new RuntimeException("LAB_PROCESS_PATH_NOT_CONFIGURED");
        }

        Path basePathObj = Paths.get(basePath);
        String dateFolder = formatDate(processDate);
        Path datePath = basePathObj.resolve(dateFolder);

        Path groupPath = datePath.resolve(groupName);
        if (!Files.exists(groupPath)) {
            Files.createDirectories(groupPath);
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.lastIndexOf(".") != -1) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            // Rename format: GroupName(index).extension
            String newFilename = String.format("%s(%d)%s", groupName, i + 1, extension);
            Path targetPath = groupPath.resolve(newFilename);

            Files.write(targetPath, file.getBytes());
        }
    }

    public void openFolder(String processDate) throws IOException {
        String basePath = getBasePath();
        if (basePath == null || basePath.trim().isEmpty()) {
            throw new RuntimeException("LAB_PROCESS_PATH_NOT_CONFIGURED");
        }

        String dateFolder = formatDate(processDate);
        Path datePath = Paths.get(basePath).resolve(dateFolder);

        if (Files.exists(datePath)) {
            // Use explorer.exe to open the folder on Windows
            new ProcessBuilder("explorer.exe", datePath.toString()).start();
        } else {
            throw new RuntimeException("FOLDER_NOT_FOUND");
        }
    }

    public void openPath(String absolutePath) throws IOException {
        Path path = Paths.get(absolutePath);
        if (Files.exists(path)) {
            new ProcessBuilder("explorer.exe", path.toString()).start();
        } else {
            throw new RuntimeException("FOLDER_NOT_FOUND");
        }
    }

    private void deleteDirectory(Path path) throws IOException {
        if (Files.exists(path)) {
            try (java.util.stream.Stream<Path> walk = Files.walk(path)) {
                walk.sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
            }
        }
    }
}
