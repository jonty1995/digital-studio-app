package com.digitalstudio.app.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.*;

@Aspect
@Component
@Slf4j
public class LoggingAspect {

    @Pointcut("within(com.digitalstudio.app.controller..*) || " +
              "within(com.digitalstudio.app.service..*) || " +
              "within(com.digitalstudio.app.repository..*)")
    public void appPointcut() {}

    @Around("appPointcut()")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        Object[] args = joinPoint.getArgs();
        String[] parameterNames = signature.getParameterNames();

        // 1. Log Entry
        String apiInfo = getRequestInfo(className);
        log.info("Enter: {}:{}() {}", className, methodName, apiInfo);

        // 2. Log Parameters
        if (args != null && args.length > 0) {
            for (int i = 0; i < args.length; i++) {
                String paramName = (parameterNames != null && parameterNames.length > i) ? parameterNames[i] : "arg" + i;
                logParameter(paramName, args[i]);
            }
        }

        long start = System.currentTimeMillis();
        Object result;
        try {
            result = joinPoint.proceed();
        } catch (Throwable e) {
            log.error("Exception in {}:{}() with message: {}", className, methodName, e.getMessage());
            throw e;
        }
        long duration = System.currentTimeMillis() - start;

        // 3. Log Exit & Result
        logExit(className, methodName, result, duration);

        return result;
    }

    private void logParameter(String name, Object value) {
        if (value == null) {
            log.info("  Param: {} = null", name);
            return;
        }

        if (isPrimitiveOrWrapper(value.getClass()) || value instanceof String) {
            log.info("  Param: {} = {}", name, value);
        } else {
            // Debug log for complex objects
            String detail = formatComplexObject(value);
            log.debug("  Param (DEBUG): {} = {}", name, detail);
        }
    }

    private void logExit(String className, String methodName, Object result, long duration) {
        if (result == null) {
            log.info("Exit: {}:{}() (Result details in DEBUG) [{}ms]", className, methodName, duration);
            return;
        }

        if (isPrimitiveOrWrapper(result.getClass()) || result instanceof String) {
            log.info("Exit: {}:{}() with result = {} [{}ms]", className, methodName, result, duration);
        } else {
            String detail = formatComplexObject(result);
            log.info("Exit: {}:{}() (Result details in DEBUG) [{}ms]", className, methodName, duration);
            log.debug("  Result (DEBUG): {}", detail);
        }
    }

    private String formatComplexObject(Object value) {
        if (value instanceof Collection<?>) {
            return "Collection(size=" + ((Collection<?>) value).size() + ") " + value.toString();
        } else if (value instanceof Map<?, ?>) {
            return "Map(size=" + ((Map<?, ?>) value).size() + ") " + value.toString();
        } else if (value.getClass().isArray()) {
            return "Array(size=" + Arrays.deepToString((Object[]) value).length() + ") " + Arrays.deepToString((Object[]) value);
        }
        return value.toString();
    }

    private String getRequestInfo(String className) {
        if (className.endsWith("Controller")) {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                return "[" + request.getMethod() + " " + request.getRequestURI() + "]";
            }
        }
        return "";
    }

    private boolean isPrimitiveOrWrapper(Class<?> type) {
        return type.isPrimitive() || 
               type == Double.class || type == Float.class || type == Long.class || 
               type == Integer.class || type == Short.class || type == Character.class || 
               type == Byte.class || type == Boolean.class;
    }
}
