package com.pgms.backend.entity;

import com.pgms.backend.entity.enums.RentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rent_records")
public class RentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_profile_id", nullable = false)
    private TenantProfile tenantProfile;

    @Column(nullable = false)
    private String billingMonth;

    @Column(nullable = false)
    private Double rentAmount;

    @Column(nullable = false)
    @Builder.Default
    private Double ebAmount = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double fineAccrued = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Double amountPaid = 0.0;

    @Column(nullable = false)
    private Double totalDue;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private String fineWaivedReason;
}
