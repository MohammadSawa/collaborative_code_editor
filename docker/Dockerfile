FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY ../frontend ./
RUN npm install && npm run build

FROM maven:3.9.4-eclipse-temurin-17 AS backend-build
WORKDIR /app
COPY ../backend ./
COPY --from=frontend-build /app/dist ./src/main/resources/static
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jdk-alpine
VOLUME /tmp
WORKDIR /app
COPY --from=backend-build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]

