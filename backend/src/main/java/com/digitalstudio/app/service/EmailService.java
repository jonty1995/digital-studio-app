package com.digitalstudio.app.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UnsupportedEncodingException;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private ConfigurationService configurationService;

    public void sendEmailWithAttachments(String to, String subject, String body, MultipartFile[] attachments)
            throws MessagingException, IOException {

        applyDynamicConfiguration();

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String from = getFromAddress();
        setSender(helper, from);

        if (to != null && to.contains(",")) {
            String[] recipients = to.split(",");
            for (int i = 0; i < recipients.length; i++) {
                recipients[i] = recipients[i].trim();
            }
            helper.setTo(recipients);
        } else {
            helper.setTo(to);
        }
        helper.setSubject(subject);
        helper.setText(body, false);

        if (attachments != null) {
            for (MultipartFile file : attachments) {
                if (file != null && !file.isEmpty()) {
                    String filename = file.getOriginalFilename();
                    if (filename != null) {
                        helper.addAttachment(filename, file);
                    }
                }
            }
        }
        mailSender.send(message);
    }

    public void sendSimpleEmail(String to, String subject, String body) throws MessagingException {
        applyDynamicConfiguration();
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

        String from = getFromAddress();
        setSender(helper, from);
        
        if (to != null) {
            helper.setTo(to);
        }
        helper.setSubject(subject);
        helper.setText(body, true); // true for HTML

        mailSender.send(message);
    }

    private void applyDynamicConfiguration() {
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
                    // Ignore
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
    }

    private String getFromAddress() {
        String from = configurationService.getValue("EMAIL_USERNAME");
        if (from == null || from.isEmpty()) {
            if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl) {
                from = ((org.springframework.mail.javamail.JavaMailSenderImpl) mailSender).getUsername();
            }
            if (from == null || from.isEmpty()) {
                from = "jontysadhukhan@gmail.com";
            }
        }
        return from;
    }

    private void setSender(MimeMessageHelper helper, String from) throws MessagingException {
        String senderName = configurationService.getValue("EMAIL_SENDER_NAME");
        if (senderName == null || senderName.isEmpty()) {
            helper.setFrom(from);
        } else {
            try {
                helper.setFrom(from, senderName);
            } catch (UnsupportedEncodingException e) {
                helper.setFrom(from);
            }
        }
    }
}
