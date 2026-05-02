package com.digitalstudio.app.repository;

import com.digitalstudio.app.model.Train;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrainRepository extends JpaRepository<Train, Long> {
    
    @Query("SELECT t FROM Train t WHERE LOWER(t.trainName) LIKE LOWER(CONCAT('%', :query, '%')) OR t.trainNumber LIKE CONCAT('%', :query, '%')")
    List<Train> searchTrains(@Param("query") String query);

    Optional<Train> findByTrainNumber(String trainNumber);

    void deleteAllInBatch();
}
