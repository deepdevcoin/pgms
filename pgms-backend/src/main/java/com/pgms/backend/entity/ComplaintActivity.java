package com.pgms.backend.entity;

import com.pgms.backend.entity.enums.ComplaintActivityType;
import com.pgms.backend.entity.enums.ComplaintStatus;
import com.pgms.backend.entity.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "complaint_activities")
public class ComplaintActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    private Long actorUserId;

    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintActivityType activityType;

    @Enumerated(EnumType.STRING)
    private ComplaintStatus fromStatus;

    @Enumerated(EnumType.STRING)
    private ComplaintStatus toStatus;

    @Lob
    private String message;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
