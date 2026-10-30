package com.student.management.shared.context;

/**
 * Thread-local context holder to maintain the active organization (tenant) ID
 * throughout the execution of a web request.
 */
public final class TenantContextHolder {

    private static final ThreadLocal<Long> CURRENT_TENANT = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> IS_SUSPENDED = ThreadLocal.withInitial(() -> false);

    private TenantContextHolder() {
    }

    public static void setTenantId(Long tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static Long getTenantId() {
        return CURRENT_TENANT.get();
    }

    public static void setSuspended(boolean suspended) {
        IS_SUSPENDED.set(suspended);
    }

    public static boolean isSuspended() {
        return Boolean.TRUE.equals(IS_SUSPENDED.get());
    }

    public static void clear() {
        CURRENT_TENANT.remove();
        IS_SUSPENDED.remove();
    }
}
