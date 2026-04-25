package com.pgms.backend.repository;

import com.pgms.backend.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findByTenantProfileUserIdOrderByCreatedAtDesc(Long userId);
    List<PaymentTransaction> findByTenantProfilePgIdOrderByCreatedAtDesc(Long pgId);
    List<PaymentTransaction> findByTenantProfilePgIdInOrderByCreatedAtDesc(List<Long> pgIds);
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
    long countByRentRecordId(Long rentRecordId);
}
