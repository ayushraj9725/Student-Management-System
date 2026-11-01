package com.student.management.shared.context;

/**
 * Thread-local context holder to maintain the active TenantContext
 * throughout the execution of a web request.
 * Guaranteed cleanup must be performed in a finally block.
 */
public final class TenantContextHolder {

    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();

    private TenantContextHolder() {
    }

    public static void setContext(TenantContext context) {
        if (context == null) {
            clear();
        } else {
            CONTEXT.set(context);
        }
    }

    public static TenantContext getContext() {
        return CONTEXT.get();
    }

    public static void setTenantId(Long tenantId) {
        TenantContext current = CONTEXT.get();
        if (current == null) {
            CONTEXT.set(new TenantContext(null, tenantId, null, null, null, false, false));
        } else {
            CONTEXT.set(new TenantContext(
                    current.userId(),
                    tenantId,
                    current.membershipId(),
                    current.organizationSlug(),
                    current.role(),
                    current.isSuperAdmin(),
                    current.isSuspended()
            ));
        }
    }

    public static Long getTenantId() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.organizationId() : null;
    }

    /**
     * Retrieves the active organization ID or throws an exception if context is absent.
     * Enforces strict fail-closed security for tenant-isolated operations.
     */
    public static Long requireTenantId() {
        Long tenantId = getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("TenantContext missing: active organization ID is required but was not resolved.");
        }
        return tenantId;
    }

    public static Long getMembershipId() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null ? ctx.membershipId() : null;
    }

    public static void setSuspended(boolean suspended) {
        TenantContext current = CONTEXT.get();
        if (current == null) {
            CONTEXT.set(new TenantContext(null, null, null, null, null, false, suspended));
        } else {
            CONTEXT.set(new TenantContext(
                    current.userId(),
                    current.organizationId(),
                    current.membershipId(),
                    current.organizationSlug(),
                    current.role(),
                    current.isSuperAdmin(),
                    suspended
            ));
        }
    }

    public static boolean isSuspended() {
        TenantContext ctx = CONTEXT.get();
        return ctx != null && ctx.isSuspended();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
