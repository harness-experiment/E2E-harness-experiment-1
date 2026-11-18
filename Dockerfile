FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle ./
COPY gradle gradle
COPY backend backend
RUN chmod +x gradlew && ./gradlew :backend:bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /app/backend/build/libs/backend.jar app.jar
USER app
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
