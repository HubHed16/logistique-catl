FROM maven:3.9.14-eclipse-temurin-25 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src

RUN mvn package --no-transfer-progress -DskipTests

FROM eclipse-temurin:25-jre

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/*.jar app.jar

COPY src/main/resources/application.yaml /app/config/application.yaml

LABEL org.opencontainers.image.title="CATL Tour API"
LABEL org.opencontainers.image.description="Route preparation service for CATL producers"

ENV SPRING_CONFIG_LOCATION=/app/config/application.yaml

RUN mkdir -p /tmp/tomcat static && chown -R 2320:2320 /app

USER 2320:2320
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1
