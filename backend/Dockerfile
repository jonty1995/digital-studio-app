# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Leveraging BuildKit cache for faster builds on the Pi's SSD
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests

# Stage 2: Run the application
# Ubuntu-based for ARM64 compatibility as suggested
FROM eclipse-temurin:17-jre
WORKDIR /app

# Install curl for healthchecks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy the jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Create directories and ensure they are writable
RUN mkdir -p /app/logs /app/uploads /app/lab

# Best practice: Run as a non-root user
RUN groupadd -r spring && useradd -r -g spring spring
RUN chown -R spring:spring /app/logs /app/uploads /app/lab
USER spring:spring

EXPOSE 8081

# Optimize JVM for the Pi 5's resources
# -XX:+UseContainerSupport ensures Java respects Docker memory limits
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]