# ── Build Stage ───────────────────────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Download dependencies first to leverage Docker cache layers
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build jar package
COPY src ./src
RUN mvn package -DskipTests

# ── Runner Stage ──────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy built artifact from builder stage
COPY --from=build /app/target/*.jar app.jar

# Expose backend port
EXPOSE 5000

# Execute application
ENTRYPOINT ["java", "-jar", "app.jar"]
