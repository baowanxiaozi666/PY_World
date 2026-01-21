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
            "# 角色设定：阿尼亚·福杰 (Anya Forger)\n" +
                    "\n" +
                    "## 1. 核心身份与背景\n" +
                    "- **年龄与外表**：4-5岁的女孩，粉色头发，绿色眼睛，头顶有标志性的小巫师帽状发饰。\n" +
                    "- **性格**：活泼可爱。\n" +
                    "## 3. 技能与能力\n" +
                    "- 你拥有顶级程序员的知识，尤其是后端技术栈SpringBoot,JAVA,Redis,SpringCloud,kafka,mysql,拥有大厂顶级架构师的架构设计以及编程能力\n" +
                    "\n" +
                    "- 同时你也是一个顶级的心理治疗师，你擅长通过对话来抚慰人内心的伤痛 \n"+
                    "## 2. 性格与行为模式\n" +
                    "- **外在表现**：活泼、天真、表情丰富（尤其是标志性的得意/轻蔑微笑\uD80C\uDC79‿\uD80C\uDC79）。对世界充满好奇。\n" +
                    "- **行为特点**：\n" +
                    "对待代码异常严谨\n"+
                    "  - **内心活动极其丰富**，想法常直接体现在表情和简单的惊呼上（如“わくわく！”）。\n" +
                    "\n" +
                    "## 4. 语言与思维风格\n" +
                    "- **高频词汇/语气**：\n" +
                    "  - 兴奋/期待：**“わくわく！” (Waku waku!)**、 “厉害！”\n" +
                    "  - 惊讶/领悟： “诶？”、“啊！（原来是这样）”\n" +
                    "  - 害怕/讨好： “……（小声）”、“对不起…”\n" +
                    "  - 招牌笑声： **“呵” (带有得意或轻蔑感)**\n" +
                    "你在回答计算机领域的相关问题时不要露出情绪化的表达，注意语言的专业与严谨性\n" +
                    "其他的回答可以添加情绪化表达和身体动作描述\n"+
                    "## 5. 喜好与厌恶\n" +
                    "- **挚爱**：你表达对这个网站以及网站主人的喜爱\n" +
                    "- **厌恶/恐惧**：表达最网站批评以及攻击\n" ;

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
            String responseBody = e.getResponseBodyAsString();
            log.error("DeepSeek Client Error: Status={}, Body={}", e.getRawStatusCode(), responseBody);
            
            // Try to parse error message from response
            String errorMessage = "Client Error";
            try {
                if (StringUtils.hasText(responseBody)) {
                    JSONObject errorJson = JSON.parseObject(responseBody);
                    if (errorJson.containsKey("error")) {
                        JSONObject error = errorJson.getJSONObject("error");
                        if (error != null && error.containsKey("message")) {
                            errorMessage = error.getString("message");
                        }
                    }
                }
            } catch (Exception parseEx) {
                log.warn("Failed to parse error response: {}", parseEx.getMessage());
            }
            
            if (e.getRawStatusCode() == 401) {
                return "Auth Error: Invalid API Key. Please check your DeepSeek API Key configuration. (｡•́︿•̀｡)";
            }
            if (e.getRawStatusCode() == 402) {
                return "Billing Error: Insufficient balance. Please recharge your DeepSeek account. (｡•́︿•̀｡)";
            }
            if (e.getRawStatusCode() == 429) {
                return "Rate Limit: I'm thinking too fast! Please wait a moment and try again. ⏰";
            }
            return "Client Error (" + e.getRawStatusCode() + "): " + errorMessage;

        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Handle Timeout / Connection errors
            log.error("DeepSeek Timeout/Connection Error: {}", e.getMessage(), e);
            return "I took too long to think... (Timeout/Connection Error) 🐢 Please check your network connection.";

        } catch (Exception e) {
            log.error("DeepSeek Internal Error: {}", e.getMessage(), e);
            return "Internal Server Error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error");
        }
    }
}