import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public class PeekZip {
    public static void main(String[] args) {
        try (ZipFile zipFile = new ZipFile("f:\\Project\\digital-studio-app\\backend\\temp_trains\\dataset.zip")) {
            ZipEntry entry = zipFile.getEntry("trains.csv");
            if (entry != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(zipFile.getInputStream(entry)))) {
                    System.out.println("HEADER: " + reader.readLine());
                }
            } else {
                System.out.println("trains.csv NOT FOUND");
                zipFile.stream().forEach(e -> System.out.println("Found: " + e.getName()));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
