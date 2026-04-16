# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# Use the official Gradle image — Gradle is pre-installed, no wrapper download needed.
# This avoids the "UnknownHostException: github.com" error that occurs when the
# Gradle wrapper tries to download its distribution during the Docker build.
FROM gradle:9-jdk21-alpine AS builder
WORKDIR /app

# Copy build config first — Docker caches this layer so dependencies are only
# re-downloaded when build.gradle changes, not on every code change.
COPY build.gradle settings.gradle ./

# Download dependencies (cached layer)
RUN gradle dependencies --no-daemon -q 2>/dev/null || true

# Copy source and build the fat JAR, skipping tests
COPY src src
RUN gradle bootJar --no-daemon -x test -q

# ─── Stage 2: Extract Spring Boot layers ──────────────────────────────────────
# Spring Boot layered JAR: splits into dependencies / application so Docker
# can cache the large deps layer separately from your code changes.
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
# JRE-only Alpine — no compiler, no build tools. ~90 MB vs 400 MB+ for JDK.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

# Least-to-most-likely-to-change order maximises layer cache hits on push
COPY --from=extractor /app/dependencies/ ./
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "org.springframework.boot.loader.launch.JarLauncher"]
