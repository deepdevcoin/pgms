package com.pgms.backend.entity;

import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
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

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pg_id", nullable = false)
    private Pg pg;

    @Column(nullable = false)
    private String roomNumber;

    @Column(nullable = false)
    private Integer floor;

    @Column(nullable = false)
    private Boolean isAC;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SharingType sharingType;

    @Column(nullable = false)
    private Double monthlyRent;

    @Column(nullable = false)
    private Double depositAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;
}
