package com.elizabeth.meditationapp;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

@WebServlet("/api/questionnaire")
public class QuestionnaireServlet extends HttpServlet {
    
    private static final String DATA_DIR = "questionnaire_responses";
    private static final Gson gson = new Gson();
    
    @Override
    public void init() throws ServletException {
        super.init();
        // Create data directory if it doesn't exist
        // Files will be saved in questionnaire_responses/ directory in the project root
        try {
            // Try to use a path relative to the project root
            String projectRoot = System.getProperty("user.dir");
            Path dataPath = Paths.get(projectRoot, DATA_DIR);
            if (!Files.exists(dataPath)) {
                Files.createDirectories(dataPath);
                System.out.println("Created questionnaire data directory: " + dataPath.toAbsolutePath());
            } else {
                System.out.println("Questionnaire data directory exists: " + dataPath.toAbsolutePath());
            }
        } catch (IOException e) {
            System.err.println("Error creating data directory: " + e.getMessage());
            // Fallback to relative path
            try {
                Path dataPath = Paths.get(DATA_DIR);
                if (!Files.exists(dataPath)) {
                    Files.createDirectories(dataPath);
                }
            } catch (IOException e2) {
                System.err.println("Error creating fallback data directory: " + e2.getMessage());
            }
        }
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        // Set CORS headers to allow frontend requests
        // In production, allow requests from your domain
        // For development, allow localhost
        String origin = request.getHeader("Origin");
        if (origin != null) {
            // Allow requests from your domain or localhost
            if (origin.contains("TCDFYPmeditaionApp.com") || 
                origin.contains("localhost") || 
                origin.contains("127.0.0.1") ||
                origin.contains("render.com") ||
                origin.contains("railway.app") ||
                origin.contains("vercel.app")) {
                response.setHeader("Access-Control-Allow-Origin", origin);
            } else {
                // In production, you might want to restrict this
                response.setHeader("Access-Control-Allow-Origin", "*");
            }
        } else {
            response.setHeader("Access-Control-Allow-Origin", "*");
        }
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        // Handle preflight OPTIONS request
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        try {
            // Read request body
            StringBuilder requestBody = new StringBuilder();
            try (BufferedReader reader = request.getReader()) {
                String line;
                while ((line = reader.readLine()) != null) {
                    requestBody.append(line);
                }
            }
            
            // Parse JSON
            JsonObject jsonData = JsonParser.parseString(requestBody.toString()).getAsJsonObject();
            
            // Add timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            jsonData.addProperty("submittedAt", timestamp);
            
            // Generate filename with timestamp
            String filename = "response_" + timestamp.replace(":", "-").replace(".", "-") + ".json";
            // Try project root first, fallback to relative
            Path dataPath;
            try {
                String projectRoot = System.getProperty("user.dir");
                dataPath = Paths.get(projectRoot, DATA_DIR);
                if (!Files.exists(dataPath)) {
                    dataPath = Paths.get(DATA_DIR);
                }
            } catch (Exception e) {
                dataPath = Paths.get(DATA_DIR);
            }
            Path filePath = dataPath.resolve(filename);
            
            // Write to file
            try (PrintWriter writer = new PrintWriter(
                    new BufferedWriter(new FileWriter(filePath.toFile(), true)))) {
                writer.println(gson.toJson(jsonData));
            }
            
            // Return success response
            JsonObject responseJson = new JsonObject();
            responseJson.addProperty("success", true);
            responseJson.addProperty("message", "Questionnaire response saved successfully");
            
            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().write(gson.toJson(responseJson));
            
        } catch (Exception e) {
            // Return error response
            JsonObject errorJson = new JsonObject();
            errorJson.addProperty("success", false);
            errorJson.addProperty("error", "Failed to save questionnaire response: " + e.getMessage());
            
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(gson.toJson(errorJson));
            
            System.err.println("Error saving questionnaire: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
