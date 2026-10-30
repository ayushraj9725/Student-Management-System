package com.student.management.iam.security.repository;

import com.student.management.iam.security.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByEmailIgnoreCaseAndPurposeOrderByIdDesc(String email, String purpose);

    Optional<OtpVerification> findTopByEmailIgnoreCaseAndPurposeAndIsVerifiedFalseOrderByIdDesc(String email, String purpose);

    Optional<OtpVerification> findTopByEmailIgnoreCaseAndIsVerifiedFalseOrderByIdDesc(String email);

    void deleteAllByEmailIgnoreCase(String email);
}
