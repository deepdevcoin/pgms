package com.pgms.backend.entity;

import com.pgms.backend.entity.enums.VacateStatus;
import com.pgms.backend.entity.enums.VacateType;
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
@Table(name = "vacate_notices")
public class VacateNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_profile_id", nullable = false)
    private TenantProfile tenantProfile;

    @Column(nullable = false)
    private LocalDate intendedVacateDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VacateType noticeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VacateStatus status;

    @Column(nullable = false)
    private Boolean refundEligible;

    @Column(nullable = false)
    private Double advanceRefundAmount;

    private String referralName;
    private String referralPhone;
    private String referralEmail;
    @Column(length = 1000)
    private String managerMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
