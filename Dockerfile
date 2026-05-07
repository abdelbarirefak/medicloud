# Étape 1 : Build (Compilation avec le JDK complet)
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app
COPY . .
# (Exemple avec Maven)
RUN ./mvnw clean package -DskipTests 

# Étape 2 : Exécution (Image finale légère avec le JRE uniquement)
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
# Copie uniquement le fichier exécutable depuis l'étape 1
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]