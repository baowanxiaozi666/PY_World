package com.sakuraverse.backend.interceptor;

import com.alibaba.fastjson.JSON;
import com.sakuraverse.backend.annotation.LoginRequired;
import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.entity.User;
import com.sakuraverse.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;  // ✅ 修复：jakarta -> javax
import javax.servlet.http.HttpServletResponse; // ✅ 修复：jakarta -> javax
import java.lang.reflect.Method;

@Component
public class AuthenticationInterceptor implements HandlerInterceptor {

    @Autowired
    private AuthService authService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. Pass OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 2. Pass static resources etc.
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        Method method = handlerMethod.getMethod();

        // 3. Check for @LoginRequired annotation
        LoginRequired loginRequired = method.getAnnotation(LoginRequired.class);
        if (loginRequired == null) {
            loginRequired = handlerMethod.getBeanType().getAnnotation(LoginRequired.class);
        }

        if (loginRequired != null && !loginRequired.required()) {
            return true; // Explicitly allowed
        }

        // 4. Default Policy: Validate Token
        return validateToken(request, response);
    }

    private boolean validateToken(HttpServletRequest request, HttpServletResponse response) throws Exception {
        String token = request.getHeader("Authorization");

        if (!StringUtils.hasText(token) || !token.startsWith("Bearer ")) {
            returnAuthError(response, "Token is missing or invalid format");
            return false;
        }

        token = token.substring(7);
        User user = authService.validateToken(token);

        if (user == null) {
            returnAuthError(response, "Token is invalid or expired");
            return false;
        }

        return true;
    }

    private void returnAuthError(HttpServletResponse response, String message) throws Exception {
        // SC_UNAUTHORIZED 在 javax 包里也是一样的
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        Result<String> result = Result.error(401, message);
        response.getWriter().write(JSON.toJSONString(result));
    }
}