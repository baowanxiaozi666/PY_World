package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    @Value("${weather.api.key:}")
    private String apiKey;

    @Value("${weather.api.url:https://api.openweathermap.org/data/2.5/weather}")
    private String apiUrl;

    private final RedisTemplate<String, Object> redisTemplate;
    private final RestTemplate restTemplate;

    {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        restTemplate = new RestTemplate(factory);
    }

    public WeatherController(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping
    public Result<Map<String, Object>> getWeather(HttpServletRequest request) {
        String clientIp = getClientIp(request);
        String cacheKey = "weather:ip:" + clientIp;

        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return Result.success((Map<String, Object>) cached);
        }

        String city = "Beijing";

        try {
            // Skip IP lookup for localhost
            if (!isLocalhost(clientIp)) {
                String ipApiUrl = "http://ip-api.com/json/" + clientIp + "?lang=zh-CN";
                Map<String, Object> ipData = restTemplate.getForObject(ipApiUrl, Map.class);

                if (ipData != null && "success".equals(ipData.get("status"))) {
                    city = (String) ipData.get("city");
                }
            }

            // Get weather data
            String weatherUrl = apiUrl + "?q=" + city + "&appid=" + apiKey + "&units=metric&lang=zh_cn";
            Map<String, Object> response = restTemplate.getForObject(weatherUrl, Map.class);

            if (response != null && response.containsKey("main")) {
                Map<String, Object> main = (Map<String, Object>) response.get("main");
                Map<String, Object> wind = (Map<String, Object>) response.get("wind");
                java.util.List<Map<String, Object>> weatherList = (java.util.List<Map<String, Object>>) response.get("weather");

                Map<String, Object> result = new HashMap<>();
                result.put("temperature", Math.round((Double) main.get("temp")));
                result.put("humidity", main.get("humidity"));
                result.put("condition", weatherList.get(0).get("main"));
                result.put("conditionCn", weatherList.get(0).get("description"));
                result.put("windDirection", getWindDirection((Double) wind.get("deg")));
                result.put("city", city);

                redisTemplate.opsForValue().set(cacheKey, result, 10, TimeUnit.MINUTES);
                return Result.success(result);
            }
        } catch (Exception e) {
            // Fallback
        }

        Map<String, Object> mock = new HashMap<>();
        mock.put("temperature", 24);
        mock.put("humidity", 64);
        mock.put("condition", "Clear");
        mock.put("conditionCn", "晴");
        mock.put("windDirection", "东风");
        mock.put("city", "Beijing");
        return Result.success(mock);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private boolean isLocalhost(String ip) {
        return ip == null || ip.isEmpty() ||
               "127.0.0.1".equals(ip) ||
               "0:0:0:0:0:0:0:1".equals(ip) ||
               "::1".equals(ip) ||
               "localhost".equalsIgnoreCase(ip);
    }

    private String getWindDirection(Double deg) {
        if (deg == null) return "无风";
        if (deg >= 337.5 || deg < 22.5) return "北风";
        if (deg >= 22.5 && deg < 67.5) return "东北风";
        if (deg >= 67.5 && deg < 112.5) return "东风";
        if (deg >= 112.5 && deg < 157.5) return "东南风";
        if (deg >= 157.5 && deg < 202.5) return "南风";
        if (deg >= 202.5 && deg < 247.5) return "西南风";
        if (deg >= 247.5 && deg < 292.5) return "西风";
        return "西北风";
    }
}
