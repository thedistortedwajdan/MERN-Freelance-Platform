# ---- build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- run
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 gigpilot && mkdir -p /data/uploads && chown -R gigpilot /data
COPY --from=build /app/target/gigpilot-backend-1.0.0.jar app.jar
USER gigpilot
ENV STORAGE_DIR=/data/uploads
EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]
