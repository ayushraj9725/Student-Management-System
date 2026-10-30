package com.student.management.iam.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignIdsRequest {

    @NotEmpty(message = "ID list cannot be empty")
    private List<Long> ids;
}
