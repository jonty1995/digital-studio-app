# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Leveraging BuildKit cache for faster builds on the Pi's SSD
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests

# Stage 2: Run the application
# Using alpine for the smallest footprint on your Pi 5
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Install curl for healthchecks (optional but helpful)
RUN apk add --no-cache curl

# Copy the jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Create directories and ensure they are writable
RUN mkdir -p /app/logs /app/uploads /app/lab && \
    chmod -R 777 /app/logs /app/uploads /app/lab

# Best practice: Run as a non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

EXPOSE 8081

# Optimize JVM for the Pi 5's resources
# -XX:+UseContainerSupport ensures Java respects Docker memory limits
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]