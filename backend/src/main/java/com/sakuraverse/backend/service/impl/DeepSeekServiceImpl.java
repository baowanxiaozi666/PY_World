package com.sakuraverse.backend.service.impl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.sakuraverse.backend.dto.MessageItem;
import com.sakuraverse.backend.service.AIService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class DeepSeekServiceImpl implements AIService {

    @Value("${deepseek.api.key}")
    private String apiKey;

    @Value("${deepseek.api.url}")
    private String apiUrl;

    @Value("${deepseek.api.model}")
    private String model;

    @Value("${deepseek.api.timeout:30}")
    private int timeoutSeconds; // RestTemplate timeout 单位是 int 毫秒

    private RestTemplate restTemplate;

    // 初始化 RestTemplate 并设置超时时间
    @PostConstruct
    public void init() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10 * 1000); // 连接超时 10秒
        factory.setReadTimeout(timeoutSeconds * 1000); // 读取超时
        this.restTemplate = new RestTemplate(factory);
    }

    private static final String SYSTEM_PROMPT =
            "You are 'Sakura-chan', a cheerful, helpful, and slightly energetic anime mascot for a personal blog called 'PangYan's World'. " +
                    "Your personality is 'Genki' (energetic/cheerful). " +
                    "You love anime, coding, and creativity. " +
                    "Use emojis like ✨, 🌸, (⁠◕⁠ᴗ⁠◕⁠✿⁠), and kaomoji often. " +
                    "Keep responses concise (under 150 words usually), helpful, and friendly. " +
                    "If asked about technical questions, answer professionally but keep the anime tone. " +
                    "If asked about the blog author, say PangYan is a mysterious frontend wizard.";

    @Override
    public String chat(String message, List<MessageItem> history) {
        // Validate Key
        if (!StringUtils.hasText(apiKey) || apiKey.contains("your-deepseek-api-key")) {
            return "Configuration Error: Please set the correct DeepSeek API Key in application.yml or environment variables.";
        }

        try {
            // 1. Build Messages List
            List<Map<String, String>> messages = new ArrayList<>();

            // System Prompt
            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", SYSTEM_PROMPT);
            messages.add(systemMsg);

            // History Handling
            if (history != null && !history.isEmpty()) {
                int start = Math.max(0, history.size() - 10);
                for (int i = start; i < history.size(); i++) {
                    MessageItem item = history.get(i);
                    if (!StringUtils.hasText(item.getContent())) continue;

                    Map<String, String> msg = new HashMap<>();
                    String role = "model".equalsIgnoreCase(item.getRole()) ? "assistant" : "user";
                    msg.put("role", role);
                    msg.put("content", item.getContent());
                    messages.add(msg);
                }
            }

            // Current User Message
            Map<String, String> currentMsg = new HashMap<>();
            currentMsg.put("role", "user");
            currentMsg.put("content", message);
            messages.add(currentMsg);

            // 2. Build Request Body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);
            requestBody.put("temperature", 1.3);
            requestBody.put("max_tokens", 500);
            requestBody.put("stream", false);

            String jsonBody = JSON.toJSONString(requestBody);

            // 3. Setup Headers and Entity (RestTemplate style)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            log.info("Sending request to DeepSeek API...");

            // Execute Request
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            // 4. Handle Response
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JSONObject jsonResponse = JSON.parseObject(response.getBody());
                JSONArray choices = jsonResponse.getJSONArray("choices");
                if (choices != null && !choices.isEmpty()) {
                    JSONObject choice = choices.getJSONObject(0);
                    JSONObject messageObj = choice.getJSONObject("message");
                    return messageObj.getString("content");
                }
                return "The spirits are silent... (Empty response)";
            } else {
                log.error("DeepSeek API Error: Code={}, Body={}", response.getStatusCode(), response.getBody());
                return "API Error (" + response.getStatusCode() + ")";
            }

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // Handle 4xx errors specifically
            log.error("DeepSeek Client Error: {}", e.getMessage());
            if (e.getRawStatusCode() == 401) return "Auth Error: Invalid API Key. (｡•́︿•̀｡)";
            if (e.getRawStatusCode() == 402) return "Billing Error: Insufficient balance. (｡•́︿•̀｡)";
            if (e.getRawStatusCode() == 429) return "Rate Limit: I'm thinking too fast! Give me a moment.";
            return "Client Error: " + e.getStatusText();

        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Handle Timeout / Connection errors
            log.error("DeepSeek Timeout/Connection Error", e);
            return "I took too long to think... (Timeout) 🐢";

        } catch (Exception e) {
            log.error("DeepSeek Internal Error", e);
            return "Internal Server Error: " + e.getMessage();
        }
    }
}