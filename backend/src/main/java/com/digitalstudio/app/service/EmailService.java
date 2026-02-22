package com.digitalstudio.app.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private ConfigurationService configurationService;

    public void sendEmailWithAttachments(String to, String subject, String body, MultipartFile[] attachments)
            throws MessagingException, IOException {

        // Apply dynamic configuration if present
        if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl) {
            org.springframework.mail.javamail.JavaMailSenderImpl impl = (org.springframework.mail.javamail.JavaMailSenderImpl) mailSender;

            String host = configurationService.getValue("EMAIL_HOST");
            if (host != null && !host.trim().isEmpty()) {
                impl.setHost(host);
            }

            String port = configurationService.getValue("EMAIL_PORT");
            if (port != null && !port.trim().isEmpty()) {
                try {
                    impl.setPort(Integer.parseInt(port));
                } catch (NumberFormatException e) {
                    // Ignore invalid port
                }
            }

            String user = configurationService.getValue("EMAIL_USERNAME");
            if (user != null && !user.trim().isEmpty()) {
                impl.setUsername(user);
            }

            String pass = configurationService.getValue("EMAIL_PASSWORD");
            if (pass != null && !pass.trim().isEmpty()) {
                impl.setPassword(pass);
            }
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String from = configurationService.getValue("EMAIL_USERNAME");
        if (from == null || from.isEmpty()) {
            // Fallback to current mailSender username if configured in properties
            if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl) {
                from = ((org.springframework.mail.javamail.JavaMailSenderImpl) mailSender).getUsername();
            }
            // Absolute fallback
            if (from == null || from.isEmpty()) {
                from = "jontysadhukhan@gmail.com";
            }
        }

        helper.setFrom(from);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(body, true);

        if (attachments != null) {
            for (MultipartFile file : attachments) {
                if (file != null && !file.isEmpty()) {
                    helper.addAttachment(file.getOriginalFilename(), file);
                }
            }
        }

        mailSender.send(message);
    }
}
