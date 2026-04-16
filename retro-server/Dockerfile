# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# Use full JDK only for building; result stays in this stage.
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Gradle wrapper + config first — Docker will cache this layer as long as
# these files don't change, skipping the slow dependency-download step.
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew

# Download dependencies (cached layer — only re-runs when build.gradle changes)
RUN ./gradlew dependencies --no-daemon -q 2>/dev/null || true

# Copy source and build the fat JAR, skipping tests
COPY src src
RUN ./gradlew bootJar --no-daemon -x test -q

# ─── Stage 2: Extract Spring Boot layers ──────────────────────────────────────
# Spring Boot 3+ supports layered JARs. Extracting them here lets Docker cache
# the large "dependencies" layer separately from "application" (your code).
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
# JRE-only Alpine image — no compiler, no javadoc, no extra tools.
# eclipse-temurin:21-jre-alpine ≈ 90 MB vs 400 MB+ for the JDK variant.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add a non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

# Copy extracted layers in dependency order (least → most likely to change)
# Each COPY is a separate Docker layer — unchanged layers are reused on push.
COPY --from=extractor /app/dependencies/ ./
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./

EXPOSE 8080

# Use the layer-aware launcher instead of running the fat JAR directly
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "org.springframework.boot.loader.launch.JarLauncher"]
