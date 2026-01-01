package com.digitalstudio.app.repository.specification;

import com.digitalstudio.app.model.PhotoOrder;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class OrderSpecification {

    public static Specification<PhotoOrder> filterOrders(LocalDate startDate, LocalDate endDate, String search, Boolean isInstant) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Date Range (using createdAt)
            // Date Range (using createdAt)
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
            }

            // Search (Name or ID)
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = criteriaBuilder.like(criteriaBuilder.lower(root.get("customer").get("name")), searchLike);
                Predicate idLike = criteriaBuilder.like(root.get("customer").get("id").as(String.class), searchLike);
                predicates.add(criteriaBuilder.or(nameLike, idLike));
            }

            // Instant Filter
            if (isInstant != null) {
                predicates.add(criteriaBuilder.equal(root.get("isInstant"), isInstant));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
