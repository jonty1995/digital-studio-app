package com.digitalstudio.app.aspect;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class LoggingAspect {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    // Define Pointcuts for Service, Repository, and Controller packages
    @Pointcut("execution(* com.digitalstudio.app.service..*(..))")
    public void servicePointcut() {}

    @Pointcut("execution(* com.digitalstudio.app.repository..*(..))")
    public void repositoryPointcut() {}
    
    @Pointcut("execution(* com.digitalstudio.app.controller..*(..))")
    public void controllerPointcut() {}

    // Combine them
    @Pointcut("servicePointcut() || repositoryPointcut() || controllerPointcut()")
    public void applicationPackagePointcut() {}

    @Around("applicationPackagePointcut()")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        Logger log = LoggerFactory.getLogger(joinPoint.getTarget().getClass());
        String methodName = joinPoint.getSignature().getName();
        
        String urlInfo = "";
        // Only check request context for Controllers
        if (joinPoint.getTarget().getClass().getSimpleName().endsWith("Controller")) {
             try {
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    urlInfo = " [" + request.getMethod() + " " + request.getRequestURI() + "]";
                }
             } catch (Exception e) {
                 // ignore if no thread context
             }
        }

        // Log Entry
        log.info("Enter: {}(){}{} with argument[s] = {}", methodName, urlInfo, 
            !urlInfo.isEmpty() ? " " : "", // separator
            java.util.Arrays.toString(joinPoint.getArgs()));

        try {
            Object result = joinPoint.proceed();
            
            if (result != null) {
                if (isPrimitiveOrWrapper(result.getClass()) || result instanceof String) {
                    log.info("Exit: {}() with result = {}", methodName, result);
                } else {
                    log.debug("Exit: {}() with result = {}", methodName, result);
                    log.info("Exit: {}() (Result details in DEBUG)", methodName);
                }
            } else {
                log.info("Exit: {}() with result = null", methodName);
            }

            return result;
        } catch (IllegalArgumentException e) {
            log.error("Illegal argument: {} in {}()", java.util.Arrays.toString(joinPoint.getArgs()), methodName);
            throw e;
        }
    }

    private boolean isPrimitiveOrWrapper(Class<?> type) {
        return (type.isPrimitive() && type != void.class) ||
            type == Double.class || type == Float.class || type == Long.class ||
            type == Integer.class || type == Short.class || type == Character.class ||
            type == Byte.class || type == Boolean.class || type == Void.class;
    }
}
