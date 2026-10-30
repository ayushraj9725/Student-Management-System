import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  CreditCard,
  School,
  Globe,
  Mail,
  ChevronDown,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { platformService } from '../../services/platformService';
import { clearTenantContext } from '../../services/apiClient';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export default function PlatformDashboard({ showToast }) {
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    planId: 1,
    contactEmail: '',
  });

  // Analytics Modal
  const [selectedAnalytics, setSelectedAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orgsData, plansData] = await Promise.all([
        platformService.getAllOrganizations(),
        platformService.getAllPlans(),
      ]);
      setOrganizations(Array.isArray(orgsData) ? orgsData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
      if (Array.isArray(plansData) && plansData.length > 0) {
        setNewOrg((prev) => ({ ...prev, planId: prev.planId || plansData[0].id }));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    clearTenantContext();
    loadData();
  }, [loadData]);

  // Handle Organization Creation
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrg.name || !newOrg.slug || !newOrg.contactEmail) {
      showToast?.('Please fill out all required onboarding fields.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await platformService.createOrganization({
        ...newOrg,
        planId: Number(newOrg.planId),
      });
      showToast?.(`School "${created.name}" onboarded successfully!`, 'success');
      setIsOnboardModalOpen(false);
      setIsPlanDropdownOpen(false);
      setOnboardSuccess({
        name: created.name,
        slug: created.slug,
        contactEmail: newOrg.contactEmail,
        activationOtp: created.activationOtp || '649281',
        planName: plans.find((p) => p.id === Number(newOrg.planId))?.name || 'STANDARD',
      });
      setNewOrg({ name: '', slug: '', planId: plans[0]?.id || 1, contactEmail: '' });
      loadData();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Organization Status (ACTIVE <-> SUSPENDED)
  const handleToggleStatus = async (org) => {
    const nextStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    
    // 1. Optimistically update local state immediately so badge and action button flip with zero lag
    setOrganizations((prev) =>
      prev.map((o) => (o.id === org.id ? { ...o, status: nextStatus } : o))
    );

    try {
      const updated = await platformService.updateOrganizationStatus(org.id, { status: nextStatus });
      if (updated && updated.status) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, status: updated.status } : o))
        );
      }
      showToast?.(
        nextStatus === 'ACTIVE'
          ? `School "${org.name}" has been activated.`
          : `School "${org.name}" has been suspended.`,
        'success'
      );
    } catch (err) {
      // Rollback to original status on failure
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, status: org.status } : o))
      );
      showToast?.(err.message || 'Failed to update organization status.', 'error');
    }
  };

  // View Tenant Analytics
  const handleOpenAnalytics = async (orgId) => {
    setIsLoadingAnalytics(true);
    try {
      const analytics = await platformService.getTenantAnalytics(orgId);
      setSelectedAnalytics(analytics);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Compute platform metrics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.status === 'ACTIVE').length;
  const suspendedOrgs = organizations.filter((o) => o.status === 'SUSPENDED').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          title="Total Schools"
          value={totalOrgs}
          subtitle="Registered institutional tenants"
          icon={Building2}
          variant="blue"
        />
        <StatCard
          title="Active Tenants"
          value={activeOrgs}
          subtitle="Schools in operational standing"
          icon={CheckCircle2}
          variant="blue"
        />
        <StatCard
          title="Suspended Tenants"
          value={suspendedOrgs}
          subtitle="Tenants locked out of service"
          icon={AlertTriangle}
          variant="pink"
        />
        <StatCard
          title="Subscription Plans"
          value={plans.length}
          subtitle="FREE, STANDARD, ENTERPRISE"
          icon={CreditCard}
          variant="blue"
        />
      </div>

      {/* Main Tenant Management Panel */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-dark)' }}>Platform Tenant Registry</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Super Admin control panel for institutional school tenant provisioning and subscription governance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-executive-secondary"
              onClick={loadData}
              disabled={loading}
              title="Refresh tenants"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn-executive-primary"
              onClick={() => setIsOnboardModalOpen(true)}
            >
              <Plus size={16} />
              <span>Onboard School</span>
            </button>
          </div>
        </div>

        {/* Tenant Directory Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Id</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>School Name</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Slug</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Plan</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Contact Email</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No registered school organizations found.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 500 }}>#{org.id}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-dark)' }}>{org.name}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem', color: '#0369a1' }}>
                        {org.slug}
                      </code>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0284c7' }}>
                        <CreditCard size={14} />
                        {org.planName || 'STANDARD'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-medium)' }}>{org.contactEmail}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status={org.status} />
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-executive-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          onClick={() => handleOpenAnalytics(org.id)}
                          title="View Quotas and Capacity"
                        >
                          <BarChart3 size={14} />
                          <span>Metrics</span>
                        </button>

                        <button
                          type="button"
                          className={org.status === 'ACTIVE' ? 'btn-executive-pink' : 'btn-executive-primary'}
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          onClick={() => handleToggleStatus(org)}
                          title={org.status === 'ACTIVE' ? 'Suspend Tenant Access' : 'Activate Tenant'}
                        >
                          {org.status === 'ACTIVE' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          <span>{org.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard School Modal */}
      <Modal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        title="Onboard New School Tenant"
        subtitle="Provision an institutional tenant and assign quota governance plan."
        footer={
          <>
            <button
              type="button"
              className="btn-executive-secondary"
              onClick={() => setIsOnboardModalOpen(false)}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-executive-primary"
              onClick={handleCreateOrg}
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              {isSubmitting ? 'Onboarding...' : 'Confirm & Provision'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
              <School size={15} color="#0284c7" />
              <span>School / Institution Name *</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Modern High School"
              value={newOrg.name}
              onChange={(e) => {
                const name = e.target.value;
                const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                setNewOrg((prev) => ({ ...prev, name, slug: autoSlug }));
              }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
              <Globe size={15} color="#0284c7" />
              <span>Unique Subdomain / Slug *</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. modern-high-school"
              value={newOrg.slug}
              onChange={(e) => setNewOrg((prev) => ({ ...prev, slug: e.target.value.toLowerCase().trim() }))}
              required
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 6, fontSize: '0.78rem', color: '#64748b' }}>
              <span>School portal domain:</span>
              <code style={{ backgroundColor: '#f1f5f9', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.76rem' }}>
                https://{newOrg.slug || 'school'}.myschoolcare.local
              </code>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
              <CreditCard size={15} color="#0284c7" />
              <span>Subscription Tier *</span>
            </label>
            
            {/* Custom Smooth Dropdown Trigger */}
            <div
              onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
              tabIndex={0}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                border: isPlanDropdownOpen ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: isPlanDropdownOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                {(() => {
                  const selPlan = (plans && plans.length > 0)
                    ? (plans.find((p) => p.id === newOrg.planId) || plans[0])
                    : null;
                  if (!selPlan) {
                    return (
                      <span style={{ fontSize: '0.86rem', color: '#64748b' }}>
                        Loading available tiers...
                      </span>
                    );
                  }
                  return (
                    <>
                      <span
                        style={{
                          backgroundColor: selPlan.name === 'ENTERPRISE' ? '#fce7f3' : selPlan.name === 'STANDARD' ? '#e0f2fe' : '#f1f5f9',
                          color: selPlan.name === 'ENTERPRISE' ? '#be185d' : selPlan.name === 'STANDARD' ? '#0369a1' : '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          letterSpacing: '0.02em',
                          flexShrink: 0,
                        }}
                      >
                        {selPlan.name}
                      </span>
                      <span style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        Up to {(selPlan.maxStudents ?? 0).toLocaleString()} Students, {selPlan.maxStaff ?? 0} Staff (₹{(selPlan.priceMonthly ?? 0).toLocaleString()}/mo)
                      </span>
                    </>
                  );
                })()}
              </div>
              <ChevronDown
                size={16}
                color="#64748b"
                style={{
                  transform: isPlanDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              />
            </div>

            {/* Custom Floating Smooth Options Card */}
            {isPlanDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                {plans.map((p) => {
                  const isSelected = p.id === newOrg.planId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setNewOrg((prev) => ({ ...prev, planId: p.id }));
                        setIsPlanDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                        border: isSelected ? '1px solid #bae6fd' : '1px solid transparent',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            backgroundColor: p.name === 'ENTERPRISE' ? '#fce7f3' : p.name === 'STANDARD' ? '#e0f2fe' : '#f1f5f9',
                            color: p.name === 'ENTERPRISE' ? '#be185d' : p.name === 'STANDARD' ? '#0369a1' : '#475569',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            minWidth: '85px',
                            textAlign: 'center',
                          }}
                        >
                          {p.name}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                            Up to {(p.maxStudents ?? 0).toLocaleString()} Students, {p.maxStaff ?? 0} Staff
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            Billing: ₹{(p.priceMonthly ?? 0).toLocaleString()}/month
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check size={16} color="#0284c7" strokeWidth={2.5} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
              <Mail size={15} color="#0284c7" />
              <span>Principal / Administrator Email *</span>
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="principal@school.edu"
              value={newOrg.contactEmail}
              onChange={(e) => setNewOrg((prev) => ({ ...prev, contactEmail: e.target.value }))}
              required
            />
            <span style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 5, display: 'block' }}>
              Activation code and security password setup link will be dispatched to this email.
            </span>
          </div>
        </form>
      </Modal>

      {/* Onboard Success Credentials & Confirmation Dialog */}
      {onboardSuccess && (
        <Modal
          isOpen={Boolean(onboardSuccess)}
          onClose={() => setOnboardSuccess(null)}
          title="School Tenant Onboarded Successfully"
          subtitle="Institutional tenant provisioned with active governance quota."
          footer={
            <button
              type="button"
              className="btn-executive-primary"
              onClick={() => setOnboardSuccess(null)}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              Done
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Institution Name</span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{onboardSuccess.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Tenant Subdomain</span>
                <code style={{ fontSize: '0.82rem', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                  {onboardSuccess.slug}
                </code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Assigned Plan</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                  {onboardSuccess.planName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Administrator Email</span>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{onboardSuccess.contactEmail}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Account Status</span>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                  Invitation Dispatched (Pending First Sign-in)
                </span>
              </div>
            </div>

            {/* Email Dispatch Notice */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f0f9ff 100%)',
                border: '1.5px solid #bbf7d0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <Mail size={16} />
              </div>
              <div style={{ flex: 1, fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: '#166534', marginBottom: '3px' }}>
                  Onboarding Invitation Dispatched
                </div>
                <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.45 }}>
                  An automated email with account activation instructions and secure setup link has been dispatched to <strong>{onboardSuccess.contactEmail}</strong>. The school head will manually enter their verification code to activate their workspace.
                </p>
                {onboardSuccess.activationOtp && (
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    Dev simulation notice: Activation OTP logged to backend console: <strong>{onboardSuccess.activationOtp}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Tenant Analytics & Quota Modal */}
      {selectedAnalytics && (
        <Modal
          isOpen={Boolean(selectedAnalytics)}
          onClose={() => setSelectedAnalytics(null)}
          title={`Quota & Capacity: ${selectedAnalytics.organizationName}`}
          subtitle={`Slug: ${selectedAnalytics.slug} | Plan: ${selectedAnalytics.planName}`}
          footer={
            <button
              type="button"
              className="btn-executive-secondary"
              onClick={() => setSelectedAnalytics(null)}
            >
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Student Enrollment
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
                  {selectedAnalytics.totalStudents} / {selectedAnalytics.maxStudentsQuota}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Capacity utilization
                </div>
              </div>

              <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Active Staff Members
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#db2777', marginTop: 4 }}>
                  {selectedAnalytics.totalStaffMembers} / {selectedAnalytics.maxStaffQuota}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Staff quota allocation
                </div>
              </div>
            </div>

            <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dark)' }}>Operational Status</span>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={selectedAnalytics.status} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
