package com.digitalstudio.app.repository.specification;

import com.digitalstudio.app.model.PhotoOrder;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class OrderSpecification {

    public static Specification<PhotoOrder> filterOrders(LocalDate startDate, LocalDate endDate, String search,
            Boolean instant, Boolean regular) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Date Range (using createdAt)
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endDate.atTime(23, 59, 59)));
            }

            // Search (Customer Name, Customer ID, Order ID, Upload ID)
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = criteriaBuilder.like(criteriaBuilder.lower(root.get("customer").get("name")),
                        searchLike);
                Predicate custIdLike = criteriaBuilder.like(root.get("customer").get("id").as(String.class),
                        searchLike);
                Predicate orderIdLike = criteriaBuilder.like(root.get("orderId").as(String.class), searchLike);
                Predicate uploadIdLike = criteriaBuilder.like(criteriaBuilder.lower(root.get("uploadId")), searchLike);

                predicates.add(criteriaBuilder.or(nameLike, custIdLike, orderIdLike, uploadIdLike));
            }

            // Instant/Regular Filter
            List<Predicate> typePredicates = new ArrayList<>();
            if (Boolean.TRUE.equals(instant)) {
                typePredicates.add(criteriaBuilder.equal(root.get("isInstant"), true));
            }
            if (Boolean.TRUE.equals(regular)) {
                typePredicates.add(criteriaBuilder.equal(root.get("isInstant"), false));
            }

            if (!typePredicates.isEmpty()) {
                predicates.add(criteriaBuilder.or(typePredicates.toArray(new Predicate[0])));
            } else {
                // If neither selected, return nothing? or everything?
                // Usually filters are "Show X". If nothing selected, show nothing.
                // But legacy might expect everything if null?
                // Let's assume frontend always sends flags. If both null, maybe ignore filter
                // (Show All).
                if (instant != null || regular != null) {
                    // At least one was sent but both false? -> Show Nothing
                    // But if specific params are passed as false, we treat them as "Don't Show".
                    // So if we are here, it means neither True flag was present.
                    // e.g. instant=false, regular=false -> Show Nothing.
                    predicates.add(criteriaBuilder.disjunction());
                }
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
