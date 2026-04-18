package com.pgms.backend.repository;

import com.pgms.backend.entity.RentRecord;
import com.pgms.backend.entity.enums.RentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RentRecordRepository extends JpaRepository<RentRecord, Long> {
    List<RentRecord> findByTenantProfileUserIdOrderByBillingMonthDesc(Long userId);
    List<RentRecord> findByTenantProfilePgIdOrderByBillingMonthDesc(Long pgId);
    Optional<RentRecord> findByTenantProfileIdAndBillingMonth(Long tenantProfileId, String billingMonth);
    List<RentRecord> findByStatusInAndDueDateBefore(List<RentStatus> statuses, LocalDate date);
    List<RentRecord> findByBillingMonth(String billingMonth);
}
