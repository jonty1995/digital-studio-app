package com.digitalstudio.app.service;

import com.digitalstudio.app.model.FinancialTransaction;
import com.digitalstudio.app.model.CreditCard;
import com.digitalstudio.app.repository.FinancialTransactionRepository;
import com.digitalstudio.app.repository.CreditCardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class FinancialService {

    @Autowired
    private FinancialTransactionRepository transactionRepository;

    @Autowired
    private CreditCardRepository creditCardRepository;

    public FinancialTransaction recordTransaction(FinancialTransaction txn) {
        if (txn.getTimestamp() == null) {
            txn.setTimestamp(LocalDateTime.now());
        }
        return transactionRepository.save(txn);
    }

    public List<CreditCard> getAllCards() {
        return creditCardRepository.findAll();
    }

    public CreditCard saveCard(CreditCard card) {
        if (card == null)
            throw new IllegalArgumentException("Card cannot be null");
        return creditCardRepository.save(card);
    }

    public void deleteCard(UUID id) {
        if (id == null)
            return;
        creditCardRepository.deleteById(id);
    }

    public Page<FinancialTransaction> getTransactions(Specification<FinancialTransaction> spec, Pageable pageable) {
        if (pageable == null)
            throw new IllegalArgumentException("Pageable cannot be null");
        // Use an empty specification if null to satisfy strict null checks
        org.springframework.data.jpa.domain.Specification<FinancialTransaction> effectiveSpec = spec != null ? spec
                : (root, query, cb) -> cb.conjunction();
        return transactionRepository.findAll(effectiveSpec, pageable);
    }

    public Double getUnbilledAmount(UUID cardId) {
        CreditCard card = creditCardRepository.findById(cardId).orElse(null);
        if (card == null)
            return 0.0;

        LocalDateTime since = card.getLastRepaymentDate();
        // If never repaid, we sum all debits.
        // If repaid, we sum all debits AFTER the last repayment date.
        return transactionRepository.findAll().stream()
                .filter(t -> cardId.equals(t.getCreditCardId()))
                .filter(t -> since == null || t.getTimestamp().isAfter(since))
                .mapToDouble(FinancialTransaction::getAmount)
                .sum();
    }

    public FinancialTransaction linkTransactionToCard(UUID transactionId, UUID cardId) {
        FinancialTransaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        txn.setCreditCardId(cardId);
        return transactionRepository.save(txn);
    }

    public void markAsPaid(UUID cardId) {
        CreditCard card = creditCardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

        Double unbilled = getUnbilledAmount(cardId);

        if (unbilled > 0) {
            FinancialTransaction repaymentTxn = new FinancialTransaction();
            repaymentTxn.setAmount(unbilled);
            repaymentTxn.setProfit(-unbilled); // Repayment is an expense that reduces net profit
            repaymentTxn.setType("DEBIT");
            repaymentTxn.setCategory("Credit Card Repayment");
            repaymentTxn.setPaymentMode("BANK");
            repaymentTxn.setDescription("Statement Paid for " + card.getName());
            repaymentTxn.setTimestamp(LocalDateTime.now());
            transactionRepository.save(repaymentTxn);
        }

        card.setLastRepaymentDate(LocalDateTime.now());
        creditCardRepository.save(card);
    }

    public java.util.Map<String, Double> getSummary(Specification<FinancialTransaction> spec) {
        // Ensure specification is not null for strict null safety
        Specification<FinancialTransaction> effectiveSpec = spec != null ? spec : (root, query, cb) -> cb.conjunction();
        List<FinancialTransaction> transactions = transactionRepository.findAll(effectiveSpec);

        double totalInflow = 0.0;
        double totalOutflow = 0.0;
        double totalProfit = 0.0;

        double upiTotal = 0.0;
        double cashTotal = 0.0;
        double bankTotal = 0.0;
        double cardTotal = 0.0;

        for (FinancialTransaction txn : transactions) {
            String mode = txn.getPaymentMode();
            if ("CREDIT".equals(txn.getType())) {
                totalInflow += txn.getAmount();

                if (mode != null) {
                    if ("UPI".equalsIgnoreCase(mode))
                        upiTotal += txn.getAmount();
                    else if ("Cash".equalsIgnoreCase(mode))
                        cashTotal += txn.getAmount();
                    else if ("Bank Transfer".equalsIgnoreCase(mode) || "BANK".equalsIgnoreCase(mode))
                        bankTotal += txn.getAmount();
                    else if ("Card".equalsIgnoreCase(mode) || "Customer Card".equalsIgnoreCase(mode))
                        cardTotal += txn.getAmount();
                }
            } else if ("DEBIT".equals(txn.getType())) {
                totalOutflow += txn.getAmount();
            }
            if (txn.getProfit() != null) {
                totalProfit += txn.getProfit();
            }
        }

        java.util.Map<String, Double> summary = new java.util.HashMap<>();
        summary.put("totalInflow", totalInflow);
        summary.put("totalOutflow", totalOutflow);
        summary.put("totalProfit", totalProfit);
        summary.put("totalUPI", upiTotal);
        summary.put("totalCash", cashTotal);
        summary.put("totalBankTransfer", bankTotal);
        summary.put("totalCard", cardTotal);
        return summary;
    }
}
