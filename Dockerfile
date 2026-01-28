# Dockerfile for Backend (Java WAR)
FROM openjdk:11-jre-slim

# Install Maven for building
FROM maven:3.8-openjdk-11 AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM openjdk:11-jre-slim
WORKDIR /app

# Copy built WAR file
COPY --from=build /app/target/MeditationApp.war /app/MeditationApp.war

# Create data directory
RUN mkdir -p /app/questionnaire_responses

# Expose port
EXPOSE 8080

# Note: WAR files typically need a servlet container
# For production, consider using Tomcat or Jetty
# This is a basic setup - you may need to adjust based on your hosting platform

CMD ["java", "-jar", "MeditationApp.war"]
