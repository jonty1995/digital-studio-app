package com.digitalstudio.app.service;

import com.digitalstudio.app.model.FinancialTransaction;
import com.digitalstudio.app.model.FinancialAccount;
import com.digitalstudio.app.model.AccountType;
import com.digitalstudio.app.repository.FinancialTransactionRepository;
import com.digitalstudio.app.repository.FinancialAccountRepository;
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
    private FinancialAccountRepository accountRepository;

    public FinancialTransaction recordTransaction(FinancialTransaction txn) {
        if (txn.getTimestamp() == null) {
            txn.setTimestamp(LocalDateTime.now());
        }
        return transactionRepository.save(txn);
    }

    public List<FinancialAccount> getAllAccounts() {
        List<FinancialAccount> accounts = accountRepository.findAll();
        for (FinancialAccount acc : accounts) {
            acc.setHasTransactions(transactionRepository.existsByAccountId(acc.getId()));
        }
        return accounts;
    }

    public FinancialAccount saveAccount(FinancialAccount account) {
        if (account == null)
            throw new IllegalArgumentException("Account cannot be null");
        return accountRepository.save(account);
    }

    public void deleteAccount(UUID id) {
        if (id == null)
            return;
        accountRepository.deleteById(id);
    }

    public Page<FinancialTransaction> getTransactions(Specification<FinancialTransaction> spec, Pageable pageable) {
        if (pageable == null)
            throw new IllegalArgumentException("Pageable cannot be null");
        // Use an empty specification if null to satisfy strict null checks
        org.springframework.data.jpa.domain.Specification<FinancialTransaction> effectiveSpec = spec != null ? spec
                : (root, query, cb) -> cb.conjunction();
        return transactionRepository.findAll(effectiveSpec, pageable);
    }

    public Double getAccountBalance(UUID accountId) {
        FinancialAccount account = accountRepository.findById(accountId).orElse(null);
        if (account == null) return 0.0;

        // Balance = Total CREDIT - Total DEBIT for ALL accounts
        return transactionRepository.findAll().stream()
                .filter(t -> accountId.equals(t.getAccountId()))
                .mapToDouble(t -> {
                    if ("CREDIT".equalsIgnoreCase(t.getType())) return t.getAmount();
                    if ("DEBIT".equalsIgnoreCase(t.getType())) return -t.getAmount();
                    return 0.0;
                })
                .sum();
    }

    public FinancialTransaction linkTransactionToAccount(UUID transactionId, UUID accountId) {
        FinancialTransaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        txn.setAccountId(accountId);
        return transactionRepository.save(txn);
    }

    public void markAsPaid(UUID accountId) {
        FinancialAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        Double unbilled = getAccountBalance(accountId);

        if (unbilled > 0) {
            FinancialTransaction repaymentTxn = new FinancialTransaction();
            repaymentTxn.setAmount(unbilled);
            repaymentTxn.setProfit(-unbilled); // Repayment is an expense that reduces net profit
            repaymentTxn.setType("DEBIT");
            repaymentTxn.setCategory("Credit Card Repayment");
            repaymentTxn.setPaymentMode("BANK");
            repaymentTxn.setDescription("Statement Paid for " + account.getName());
            repaymentTxn.setTimestamp(LocalDateTime.now());
            transactionRepository.save(repaymentTxn);
        }

        account.setLastRepaymentDate(LocalDateTime.now());
        accountRepository.save(account);
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

    public void recordTransfer(UUID fromAccountId, UUID toAccountId, Double amount, String description) {
        FinancialAccount fromAccount = accountRepository.findById(fromAccountId)
                .orElseThrow(() -> new IllegalArgumentException("From account not found"));
        FinancialAccount toAccount = accountRepository.findById(toAccountId)
                .orElseThrow(() -> new IllegalArgumentException("To account not found"));

        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Transfer amount must be greater than zero");
        }

        if (fromAccount.getAccountType() != AccountType.CREDIT_CARD) {
            Double balance = getAccountBalance(fromAccountId);
            if (balance < amount) {
                throw new IllegalArgumentException("Insufficient balance in source account. Available: " + balance);
            }
        }

        LocalDateTime now = LocalDateTime.now();

        FinancialTransaction credit = new FinancialTransaction();
        credit.setAccountId(toAccountId);
        credit.setAmount(amount);
        credit.setType("CREDIT");
        credit.setCategory("TRANSFER");
        credit.setDescription("Transfer to " + toAccount.getName() + (description != null && !description.isEmpty() ? " - " + description : ""));
        credit.setTimestamp(now);
        transactionRepository.save(credit);

        FinancialTransaction debit = new FinancialTransaction();
        debit.setAccountId(fromAccountId);
        debit.setAmount(amount);
        debit.setType("DEBIT");
        debit.setCategory("TRANSFER");
        debit.setDescription("Transfer from " + fromAccount.getName() + (description != null && !description.isEmpty() ? " - " + description : ""));
        debit.setTimestamp(now.plusNanos(1000)); // ensure debit appears first if sorted by timestamp desc
        transactionRepository.save(debit);
    }
}
