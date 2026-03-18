import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;
import java.util.List;
import java.util.UUID;

public class TestDeserialization {
    public static void main(String[] args) throws Exception {
        String json = new String(Files.readAllBytes(Paths.get("test_config.json")));
        ObjectMapper mapper = new ObjectMapper();
        
        try {
            Map<?, ?> dto = mapper.readValue(json, Map.class);
            System.out.println("Mapped keys: " + dto.keySet());
            List<?> photoItems = (List<?>) dto.get("photoItems");
            System.out.println("Parsed " + photoItems.size() + " photo items");
        } catch(Exception e) {
            e.printStackTrace();
        }
    }
}
