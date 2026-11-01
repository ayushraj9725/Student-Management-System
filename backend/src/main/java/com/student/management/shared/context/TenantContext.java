package com.student.management.shared.context;

import java.io.Serializable;

/**
 * Immutable production TenantContext record.
 * Holds verified caller identity and organizational boundary metadata for the active thread.
 */
public record TenantContext(
        Long userId,
        Long organizationId,
        Long membershipId,
        String organizationSlug,
        String role,
        boolean isSuperAdmin,
        boolean isSuspended
) implements Serializable {

    public static TenantContext empty() {
        return new TenantContext(null, null, null, null, null, false, false);
    }

    public boolean hasTenant() {
        return organizationId != null && organizationId > 0;
    }
}

