'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Layers,
  KeyRound,
  Plus,
  RefreshCw,
  Check,
  UserCheck,
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserX,
  Send,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { rbacService } from '../../services/rbacService';
import { getActiveTenantId } from '../../services/apiClient';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export default function IamDashboard({ showToast, organization }) {
  const isSuspended = organization?.status === 'SUSPENDED';
  const [activeSubTab, setActiveSubTab] = useState(organization ? 'members' : 'roles'); // 'members' | 'roles' | 'groups' | 'inspector'
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add / Provision Staff Member
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [provisionMode, setProvisionMode] = useState('INSTANT'); // 'INSTANT' | 'EMAIL_INVITE'
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    roleIds: [],
    groupIds: [],
  });
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffModalError, setStaffModalError] = useState('');

  // Modal: Create Custom Role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissionIds: [] });
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Modal: Create Group / Department
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Modal: Assign Roles to Group
  const [assignGroupTarget, setAssignGroupTarget] = useState(null);
  const [selectedRoleIdsForGroup, setSelectedRoleIdsForGroup] = useState([]);

  // Modal: Approve Staff Member
  const [approvingMember, setApprovingMember] = useState(null);
  const [approvalRoleId, setApprovalRoleId] = useState('');
  const [approvalGroupId, setApprovalGroupId] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Effective Permissions Inspector
  const [inspectMembershipId, setInspectMembershipId] = useState('');
  const [permissionSummary, setPermissionSummary] = useState(null);
  const [inspecting, setInspecting] = useState(false);

  // Strict tenant boundary - no fallback to 1
  const activeTenantId = organization?.id || getActiveTenantId();

  const loadRbacData = useCallback(async () => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rolesData, permsData, groupsData, membersData] = await Promise.all([
        rbacService.getRoles(activeTenantId),
        rbacService.getAllPermissions(),
        rbacService.getGroups(activeTenantId),
        rbacService.getMembers(activeTenantId).catch(() => []),
      ]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(Array.isArray(permsData) ? permsData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadRbacData();
  }, [loadRbacData]);

  // Handle Provisioning Staff Member
  const handleProvisionStaff = async (e) => {
    e.preventDefault();
    setStaffModalError('');
    if (isSuspended) {
      const msg = 'Staff provisioning is disabled while this school is suspended.';
      setStaffModalError(msg);
      showToast?.(msg, 'error');
      return;
    }
    if (!staffForm.fullName.trim() || !staffForm.email.trim()) {
      const msg = 'Full name and email address are required.';
      setStaffModalError(msg);
      showToast?.(msg, 'error');
      return;
    }
    if (provisionMode === 'INSTANT' && (!staffForm.password || staffForm.password.length < 6)) {
      const msg = 'Password must be at least 6 characters for instant provisioning.';
      setStaffModalError(msg);
      showToast?.(msg, 'error');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const payload = {
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        username: staffForm.username.trim() || undefined,
        provisionMode,
        password: provisionMode === 'INSTANT' ? staffForm.password : undefined,
        roleIds: staffForm.roleIds.length > 0 ? staffForm.roleIds : undefined,
        groupIds: staffForm.groupIds.length > 0 ? staffForm.groupIds : undefined,
      };

      await rbacService.provisionStaffUser(payload, activeTenantId);
      showToast?.(
        provisionMode === 'INSTANT'
          ? `Staff user "${staffForm.fullName}" provisioned successfully.`
          : `Onboarding invitation dispatched to ${staffForm.email}.`,
        'success'
      );
      setIsAddStaffModalOpen(false);
      setStaffModalError('');
      setStaffForm({
        fullName: '',
        email: '',
        username: '',
        password: '',
        roleIds: [],
        groupIds: [],
      });
      loadRbacData();
    } catch (err) {
      const errMsg = err.message || 'Failed to provision staff member.';
      setStaffModalError(errMsg);
      showToast?.(errMsg, 'error');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Handle Toggling Staff Status (ACTIVE <-> SUSPENDED)
  const handleToggleStaffStatus = async (member) => {
    if (isSuspended) {
      showToast?.('Status updates are disabled while this school is suspended.', 'error');
      return;
    }
    const targetStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const memberName = member.fullName || member.username;

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) =>
        m.membershipId === member.membershipId ? { ...m, status: targetStatus } : m
      )
    );

    try {
      await rbacService.updateMembershipStatus(member.membershipId, targetStatus, activeTenantId);
      showToast?.(`Staff member "${memberName}" status updated to ${targetStatus}.`, 'success');
    } catch (err) {
      // Rollback on failure
      setMembers((prev) =>
        prev.map((m) =>
          m.membershipId === member.membershipId ? { ...m, status: member.status } : m
        )
      );
      showToast?.(err.message || 'Failed to update staff status.', 'error');
    }
  };

  // Handle Create Custom Role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (isSuspended) {
      showToast?.('Role creation is disabled while this school is suspended.', 'error');
      return;
    }
    if (!newRole.name) {
      showToast?.('Role name is required.', 'error');
      return;
    }
    setIsSubmittingRole(true);
    try {
      await rbacService.createCustomRole(newRole, activeTenantId);
      showToast?.(`Custom role "${newRole.name}" created successfully.`, 'success');
      setIsRoleModalOpen(false);
      setNewRole({ name: '', description: '', permissionIds: [] });
      loadRbacData();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Toggle permission checkbox for new role
  const togglePermission = (id) => {
    setNewRole((prev) => {
      const exists = prev.permissionIds.includes(id);
      return {
        ...prev,
        permissionIds: exists
          ? prev.permissionIds.filter((p) => p !== id)
          : [...prev.permissionIds, id],
      };
    });
  };

  const applicationModulesCatalog = [
    {
      code: 'STUDENT_MANAGEMENT',
      title: 'Staff & Student Records',
      color: '#0284c7',
      permPrefixes: ['student:', 'course:'],
    },
    {
      code: 'ATTENDANCE',
      title: 'Attendance Management',
      color: '#9333ea',
      permPrefixes: ['attendance:'],
    },
    {
      code: 'EXAMINATION',
      title: 'Examination & Results',
      color: '#ea580c',
      permPrefixes: ['grade:', 'exam:', 'report:'],
    },
    {
      code: 'FINANCE',
      title: 'Fee & Finance Management',
      color: '#0d9488',
      permPrefixes: ['finance:', 'fee:'],
    },
    {
      code: 'IAM_GOVERNANCE',
      title: 'Identity & Access (IAM)',
      color: '#db2777',
      permPrefixes: ['rbac:'],
    },
  ];

  const toggleApplicationModule = (mod) => {
    const matchingPermIds = permissions
      .filter((p) => mod.permPrefixes.some((prefix) => p.code.startsWith(prefix)))
      .map((p) => p.id);

    if (matchingPermIds.length === 0) return;

    setNewRole((prev) => {
      const allSelected = matchingPermIds.every((id) => prev.permissionIds.includes(id));
      const nextPermissionIds = allSelected
        ? prev.permissionIds.filter((id) => !matchingPermIds.includes(id))
        : Array.from(new Set([...prev.permissionIds, ...matchingPermIds]));
      return {
        ...prev,
        permissionIds: nextPermissionIds,
      };
    });
  };

  // Handle Create Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (isSuspended) {
      showToast?.('Department group creation is disabled while this school is suspended.', 'error');
      return;
    }
    if (!newGroup.name) {
      showToast?.('Department/Group name is required.', 'error');
      return;
    }
    setIsSubmittingGroup(true);
    try {
      await rbacService.createGroup(newGroup, activeTenantId);
      showToast?.(`Department "${newGroup.name}" created.`, 'success');
      setIsGroupModalOpen(false);
      setNewGroup({ name: '', description: '' });
      loadRbacData();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Handle Assign Roles to Group
  const handleAssignRolesToGroup = async () => {
    if (!assignGroupTarget) return;
    if (isSuspended) {
      showToast?.('Modifications are disabled while this school is suspended.', 'error');
      return;
    }
    try {
      await rbacService.assignRolesToGroup(assignGroupTarget.id, selectedRoleIdsForGroup);
      showToast?.('Roles assigned to department group successfully.', 'success');
      setAssignGroupTarget(null);
      setSelectedRoleIdsForGroup([]);
      loadRbacData();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  // Run Permissions Inspector
  const handleRunInspector = async (memIdParam) => {
    const targetId = memIdParam || inspectMembershipId;
    const memId = parseInt(targetId, 10);
    if (isNaN(memId)) return;
    setInspecting(true);
    try {
      const summary = await rbacService.getMemberPermissionSummary(memId);
      setPermissionSummary(summary);
    } catch (err) {
      showToast?.(err.message, 'error');
      setPermissionSummary(null);
    } finally {
      setInspecting(false);
    }
  };

  // Handle Staff Approval
  const handleApproveMember = async (e) => {
    e?.preventDefault();
    if (!approvingMember) return;
    if (isSuspended) {
      showToast?.('Staff approvals are disabled while this school is suspended.', 'error');
      return;
    }
    setIsSubmittingApproval(true);
    try {
      const roleIds = approvalRoleId ? [Number(approvalRoleId)] : [];
      const groupIds = approvalGroupId ? [Number(approvalGroupId)] : [];
      await rbacService.approveStaffMembership(approvingMember.membershipId, {
        roleIds,
        groupIds,
      });
      showToast?.(`Staff member "${approvingMember.fullName || approvingMember.username}" approved successfully.`, 'success');
      setApprovingMember(null);
      setApprovalRoleId('');
      setApprovalGroupId('');
      loadRbacData();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Staff Rejection
  const handleRejectMember = async (member) => {
    if (isSuspended) {
      showToast?.('Staff membership actions are disabled while this school is suspended.', 'error');
      return;
    }
    const name = member.fullName || member.username;
    if (!confirm(`Are you sure you want to reject registration for ${name}?`)) return;
    try {
      await rbacService.rejectStaffMembership(member.membershipId);
      showToast?.(`Registration for ${name} rejected.`, 'info');
      loadRbacData();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  if (!activeTenantId) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '32px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={24} color="#db2777" />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
          Tenant Context Missing
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Please select or navigate from an active school workspace URL to access Identity and Access Governance.
        </p>
      </div>
    );
  }

  const pendingMembers = members.filter((m) => m.status === 'PENDING_APPROVAL');
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');
  const suspendedMembers = members.filter((m) => m.status === 'SUSPENDED');

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          title="Total Staff"
          value={members.length}
          subtitle={`${activeMembers.length} active · ${suspendedMembers.length} suspended`}
          icon={Users}
          variant="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingMembers.length}
          subtitle="Awaiting Head authorization"
          icon={Clock}
          variant={pendingMembers.length > 0 ? 'pink' : 'blue'}
        />
        <StatCard
          title="Departments"
          value={groups.length}
          subtitle="Staff organizational units"
          icon={Layers}
          variant="blue"
        />
        <StatCard
          title={organization?.name || 'School Workspace'}
          value={organization ? organization.planName || 'Active' : `Org #${activeTenantId}`}
          subtitle="Strict Tenant Boundary Scoped"
          icon={ShieldCheck}
          variant="pink"
        />
      </div>

      {/* IAM Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`executive-nav-btn ${activeSubTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('members')}
        >
          <Users size={16} />
          <span>Staff Directory & Provisioning</span>
          {pendingMembers.length > 0 && (
            <span style={{
              marginLeft: 6,
              backgroundColor: '#db2777',
              color: '#ffffff',
              borderRadius: 10,
              padding: '1px 7px',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              {pendingMembers.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`executive-nav-btn ${activeSubTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('groups')}
        >
          <Layers size={16} />
          <span>Departments & Groups</span>
        </button>
        <button
          type="button"
          className={`executive-nav-btn ${activeSubTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('roles')}
        >
          <Shield size={16} />
          <span>Roles & Capabilities</span>
        </button>
        <button
          type="button"
          className={`executive-nav-btn ${activeSubTab === 'inspector' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('inspector')}
        >
          <UserCheck size={16} />
          <span>Capabilities Inspector</span>
        </button>
      </div>

      {/* TAB 0: STAFF DIRECTORY & PROVISIONING */}
      {activeSubTab === 'members' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Staff Directory & Account Provisioning</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Autonomously manage institutional staff members, provision new accounts via instant credentials or email invitation, and govern access status.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-executive-secondary" onClick={loadRbacData}>
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="btn-executive-primary"
                onClick={() => {
                  if (isSuspended) {
                    showToast?.('Staff provisioning is disabled while school is suspended.', 'error');
                    return;
                  }
                  setIsAddStaffModalOpen(true);
                }}
                disabled={isSuspended}
                style={{
                  opacity: isSuspended ? 0.6 : 1,
                  cursor: isSuspended ? 'not-allowed' : 'pointer',
                }}
                title={isSuspended ? 'Provisioning disabled while school is suspended' : 'Add Staff Member'}
              >
                <UserPlus size={16} />
                <span>Add Staff Member</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading staff directory...</div>
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Users size={24} color="#0284c7" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No staff registered yet</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 440, margin: '0 auto 16px' }}>
                You can add staff members directly or dispatch onboarding invitations using the button above.
              </p>
              <button
                type="button"
                className="btn-executive-primary"
                onClick={() => setIsAddStaffModalOpen(true)}
                disabled={isSuspended}
              >
                <UserPlus size={15} />
                <span>Provision First Staff Member</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                    <th style={{ padding: '12px 20px' }}>Staff Identity</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Departments</th>
                    <th style={{ padding: '12px 16px' }}>Direct Roles</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.membershipId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{member.fullName || 'Staff Member'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{member.username}</span>
                          {member.email && (
                            <>
                              <span>·</span>
                              <span style={{ color: '#0284c7' }}>{member.email}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={member.status} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {member.groupNames && member.groupNames.length > 0 ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {member.groupNames.map((g, i) => (
                              <span key={i} style={{ fontSize: '0.72rem', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                                {g}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {member.directRoles && member.directRoles.length > 0 ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {member.directRoles.map((r, i) => (
                              <span key={i} style={{ fontSize: '0.72rem', backgroundColor: '#fce7f3', color: '#db2777', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None direct</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {member.status === 'PENDING_APPROVAL' ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-executive-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                opacity: isSuspended ? 0.5 : 1,
                                cursor: isSuspended ? 'not-allowed' : 'pointer',
                              }}
                              disabled={isSuspended}
                              title={isSuspended ? 'Staff approvals disabled while school is suspended' : 'Approve Staff Member'}
                              onClick={() => {
                                if (isSuspended) {
                                  showToast?.('Staff approvals are disabled while school is suspended.', 'error');
                                  return;
                                }
                                setApprovingMember(member);
                                setApprovalRoleId(roles[0]?.id ? String(roles[0].id) : '');
                                setApprovalGroupId(groups[0]?.id ? String(groups[0].id) : '');
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="btn-executive-secondary"
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                color: isSuspended ? '#94a3b8' : '#dc2626',
                                opacity: isSuspended ? 0.5 : 1,
                                cursor: isSuspended ? 'not-allowed' : 'pointer',
                              }}
                              disabled={isSuspended}
                              title={isSuspended ? 'Rejection disabled while school is suspended' : 'Reject Staff Member'}
                              onClick={() => {
                                if (isSuspended) {
                                  showToast?.('Staff membership actions are disabled while school is suspended.', 'error');
                                  return;
                                }
                                handleRejectMember(member);
                              }}
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-executive-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setInspectMembershipId(String(member.membershipId));
                                setActiveSubTab('inspector');
                                handleRunInspector(String(member.membershipId));
                              }}
                            >
                              <UserCheck size={14} />
                              <span>Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(member)}
                              disabled={isSuspended}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 6,
                                border: member.status === 'ACTIVE' ? '1px solid #fecdd3' : '1px solid #bae6fd',
                                backgroundColor: member.status === 'ACTIVE' ? '#fff1f2' : '#f0f9ff',
                                color: member.status === 'ACTIVE' ? '#db2777' : '#0284c7',
                                cursor: isSuspended ? 'not-allowed' : 'pointer',
                                opacity: isSuspended ? 0.5 : 1,
                                transition: 'all 0.15s ease',
                              }}
                              title={member.status === 'ACTIVE' ? 'Suspend staff access' : 'Reactivate staff access'}
                            >
                              {member.status === 'ACTIVE' ? (
                                <>
                                  <UserX size={13} />
                                  <span>Suspend</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: DEPARTMENTS & GROUPS */}
      {activeSubTab === 'groups' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Departmental Groups</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Organize staff into institutional faculties (e.g. Science, Mathematics, Finance) and bind security roles to groups.
              </p>
            </div>
            <button
              type="button"
              className="btn-executive-primary"
              onClick={() => {
                if (isSuspended) {
                  showToast?.('Department group creation is disabled while this school is suspended.', 'error');
                  return;
                }
                setIsGroupModalOpen(true);
              }}
              disabled={isSuspended}
              style={{
                opacity: isSuspended ? 0.6 : 1,
                cursor: isSuspended ? 'not-allowed' : 'pointer',
              }}
              title={isSuspended ? 'Department creation disabled while school is suspended' : 'New Department'}
            >
              <Plus size={16} />
              <span>New Department</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Id</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Department Name</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                      No departmental groups created for this school yet.
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr key={group.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>#{group.id}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>{group.name}</td>
                      <td style={{ padding: '14px 20px', color: '#475569' }}>{group.description || '—'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-executive-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            opacity: isSuspended ? 0.5 : 1,
                            cursor: isSuspended ? 'not-allowed' : 'pointer',
                          }}
                          disabled={isSuspended}
                          title={isSuspended ? 'Role assignment disabled while school is suspended' : 'Assign Roles'}
                          onClick={() => {
                            if (isSuspended) {
                              showToast?.('Role assignments are disabled while school is suspended.', 'error');
                              return;
                            }
                            setAssignGroupTarget(group);
                            setSelectedRoleIdsForGroup([]);
                          }}
                        >
                          <KeyRound size={13} />
                          <span>Assign Roles</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & CAPABILITIES */}
      {activeSubTab === 'roles' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>School Roles Directory</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Predefined template roles and custom school capability bundles.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-executive-secondary" onClick={loadRbacData}>
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="btn-executive-primary"
                onClick={() => {
                  if (isSuspended) {
                    showToast?.('Role creation is disabled while this school is suspended.', 'error');
                    return;
                  }
                  setIsRoleModalOpen(true);
                }}
                disabled={isSuspended}
                style={{
                  opacity: isSuspended ? 0.6 : 1,
                  cursor: isSuspended ? 'not-allowed' : 'pointer',
                }}
                title={isSuspended ? 'Role creation disabled while school is suspended' : 'Create Custom Role'}
              >
                <Plus size={16} />
                <span>Create Custom Role</span>
              </button>
            </div>
          </div>

          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {roles.map((role) => (
              <div
                key={role.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: 16,
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{role.name}</h3>
                    <StatusBadge
                      status={role.isSystemTemplate ? 'TEMPLATE' : 'ACTIVE'}
                      label={role.isSystemTemplate ? 'Template' : 'Custom'}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 14 }}>
                    {role.description || 'No description provided.'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                    Assigned Capabilities ({role.permissions?.length || 0})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {role.permissions && role.permissions.length > 0 ? (
                      role.permissions.map((p) => (
                        <span
                          key={p.id}
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            borderRadius: 4,
                            border: '1px solid #bae6fd',
                          }}
                        >
                          {p.code}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>No capabilities assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EFFECTIVE PERMISSIONS INSPECTOR */}
      {activeSubTab === 'inspector' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Staff Effective Capabilities Inspector
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
              Inspect real-time union of direct staff roles, group-inherited roles, and resulting capability permissions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 280, flex: 1 }}>
              <select
                className="form-control"
                value={inspectMembershipId}
                onChange={(e) => {
                  setInspectMembershipId(e.target.value);
                  if (e.target.value) {
                    handleRunInspector(e.target.value);
                  } else {
                    setPermissionSummary(null);
                  }
                }}
              >
                <option value="">Select a staff member to inspect...</option>
                {members.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.fullName || m.username} ({m.email || 'No email'}) · #{m.membershipId}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-executive-primary"
              onClick={() => handleRunInspector()}
              disabled={inspecting || !inspectMembershipId}
            >
              <UserCheck size={16} />
              <span>{inspecting ? 'Resolving...' : 'Inspect Capabilities'}</span>
            </button>
          </div>

          {permissionSummary && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: 20, backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                    Staff Member
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    {permissionSummary.fullName || permissionSummary.username}
                  </div>
                  {permissionSummary.email && (
                    <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>{permissionSummary.email}</div>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                    Membership Status
                  </span>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge status={permissionSummary.status} />
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                    Direct Assigned Roles
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7', marginTop: 2 }}>
                    {permissionSummary.directRoles?.join(', ') || 'None'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                    Inherited from Groups
                  </span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#db2777', marginTop: 2 }}>
                    {permissionSummary.groupInheritedRoles?.join(', ') || 'None'}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                  Effective Capabilities Granted ({permissionSummary.effectivePermissions?.length || 0})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {permissionSummary.effectivePermissions?.map((perm) => (
                    <span
                      key={perm}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #bae6fd',
                        color: '#0369a1',
                        borderRadius: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: PROVISION / ADD STAFF MEMBER */}
      <Modal
        isOpen={isAddStaffModalOpen}
        onClose={() => {
          setIsAddStaffModalOpen(false);
          setStaffModalError('');
        }}
        title="Provision Institutional Staff Member"
        subtitle={`Add a new staff member to ${organization?.name || 'this school workspace'}.`}
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              type="button"
              className="btn-executive-secondary"
              onClick={() => {
                setIsAddStaffModalOpen(false);
                setStaffModalError('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-executive-primary"
              onClick={handleProvisionStaff}
              disabled={isSubmittingStaff}
            >
              {isSubmittingStaff ? (
                'Provisioning...'
              ) : provisionMode === 'INSTANT' ? (
                <>
                  <UserPlus size={15} />
                  <span>Provision Account</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Onboarding Invite</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleProvisionStaff} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {staffModalError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                backgroundColor: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: 8,
                color: '#be123c',
                fontSize: '0.83rem',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={16} color="#e11d48" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>{staffModalError}</span>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>
              Provisioning Strategy *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div
                onClick={() => setProvisionMode('INSTANT')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: provisionMode === 'INSTANT' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  backgroundColor: provisionMode === 'INSTANT' ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Lock size={16} color={provisionMode === 'INSTANT' ? '#0284c7' : '#64748b'} />
                  <strong style={{ fontSize: '0.85rem', color: provisionMode === 'INSTANT' ? '#0369a1' : '#0f172a' }}>
                    Instant Provisioning
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                  Principal sets credentials directly. Staff member can sign in immediately.
                </p>
              </div>

              <div
                onClick={() => setProvisionMode('EMAIL_INVITE')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: provisionMode === 'EMAIL_INVITE' ? '2px solid #db2777' : '1px solid #e2e8f0',
                  backgroundColor: provisionMode === 'EMAIL_INVITE' ? '#fdf2f8' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Mail size={16} color={provisionMode === 'EMAIL_INVITE' ? '#db2777' : '#64748b'} />
                  <strong style={{ fontSize: '0.85rem', color: provisionMode === 'EMAIL_INVITE' ? '#be185d' : '#0f172a' }}>
                    Email Invitation Handshake
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                  Dispatches an official email with cryptographic OTP and password setup link.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dr. Rajesh Sharma"
                value={staffForm.fullName}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="staff@school.edu"
                value={staffForm.email}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: provisionMode === 'INSTANT' ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                Username <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Auto-derived from email if blank"
                value={staffForm.username}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, username: e.target.value }))}
              />
            </div>

            {provisionMode === 'INSTANT' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                  Direct Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showStaffPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                    style={{ paddingRight: 36 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {showStaffPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Roles Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Assign Direct Security Roles
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', padding: 8, borderRadius: 6 }}>
              {roles.map((r) => {
                const isSelected = staffForm.roleIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() =>
                      setStaffForm((prev) => ({
                        ...prev,
                        roleIds: isSelected
                          ? prev.roleIds.filter((id) => id !== r.id)
                          : [...prev.roleIds, r.id],
                      }))
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 6,
                      borderRadius: 4,
                      backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                      border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                      }}
                    >
                      {isSelected && <Check size={12} color="#ffffff" />}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Assign Institutional Departments
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', padding: 8, borderRadius: 6 }}>
              {groups.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: 8 }}>
                  No departments created yet. You can create them in the Departments tab.
                </div>
              ) : (
                groups.map((g) => {
                  const isSelected = staffForm.groupIds.includes(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() =>
                        setStaffForm((prev) => ({
                          ...prev,
                          groupIds: isSelected
                            ? prev.groupIds.filter((id) => id !== g.id)
                            : [...prev.groupIds, g.id],
                        }))
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 6,
                        borderRadius: 4,
                        backgroundColor: isSelected ? '#fdf2f8' : '#ffffff',
                        border: isSelected ? '1px solid #db2777' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 3,
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? '#db2777' : '#ffffff',
                        }}
                      >
                        {isSelected && <Check size={12} color="#ffffff" />}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{g.name}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Custom Role */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Create Custom School Role"
        subtitle="Define a custom role and assign specific capabilities for this school."
        maxWidth="max-w-xl"
        footer={
          <>
            <button type="button" className="btn-executive-secondary" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-executive-primary"
              onClick={handleCreateRole}
              disabled={isSubmittingRole}
            >
              {isSubmittingRole ? 'Saving...' : 'Create Role'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Role Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. LAB_COORDINATOR"
              value={newRole.name}
              onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Describes responsibilities and scope"
              value={newRole.description}
              onChange={(e) => setNewRole((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Attribute-Based Application Visibility Toggles */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
              Application Module Visibility (Attribute-Based Access)
            </label>
            <p style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 8 }}>
              Click an application module to automatically entitle or revoke access on the user dashboard.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {applicationModulesCatalog.map((mod) => {
                const matchingPerms = permissions.filter((p) =>
                  mod.permPrefixes.some((prefix) => p.code.startsWith(prefix))
                );
                const isFullyEntitled =
                  matchingPerms.length > 0 &&
                  matchingPerms.every((p) => newRole.permissionIds.includes(p.id));
                const isPartiallyEntitled =
                  !isFullyEntitled &&
                  matchingPerms.some((p) => newRole.permissionIds.includes(p.id));

                return (
                  <button
                    key={mod.code}
                    type="button"
                    onClick={() => toggleApplicationModule(mod)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: isFullyEntitled
                        ? `1.5px solid ${mod.color}`
                        : isPartiallyEntitled
                        ? '1px dashed #94a3b8'
                        : '1px solid #e2e8f0',
                      backgroundColor: isFullyEntitled ? '#f0fdf4' : isPartiallyEntitled ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isFullyEntitled ? '#15803d' : '#1e293b' }}>
                        {mod.title}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {isFullyEntitled ? 'Full Access' : isPartiallyEntitled ? 'Partial Access' : 'No Access'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: isFullyEntitled ? '#bbf7d0' : '#f1f5f9',
                        color: isFullyEntitled ? '#166534' : '#64748b',
                      }}
                    >
                      {isFullyEntitled ? 'Entitled' : 'Disabled'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>
              Fine-Grained Capabilities ({newRole.permissionIds.length} selected)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', padding: 10, borderRadius: 6 }}>
              {permissions.map((p) => {
                const isChecked = newRole.permissionIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePermission(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 6,
                      borderRadius: 4,
                      backgroundColor: isChecked ? '#e0f2fe' : '#ffffff',
                      border: isChecked ? '1px solid #bae6fd' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isChecked ? '#0284c7' : '#ffffff',
                      }}
                    >
                      {isChecked && <Check size={12} color="#ffffff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{p.code}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Department */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Create Department Group"
        subtitle="Group staff members into institutional teams or faculties."
        footer={
          <>
            <button type="button" className="btn-executive-secondary" onClick={() => setIsGroupModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-executive-primary"
              onClick={handleCreateGroup}
              disabled={isSubmittingGroup}
            >
              {isSubmittingGroup ? 'Creating...' : 'Create Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Department Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Science Department"
              value={newGroup.name}
              onChange={(e) => setNewGroup((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Scope and responsibilities of this group"
              value={newGroup.description}
              onChange={(e) => setNewGroup((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Roles to Department */}
      {assignGroupTarget && (
        <Modal
          isOpen={Boolean(assignGroupTarget)}
          onClose={() => setAssignGroupTarget(null)}
          title={`Assign Roles to: ${assignGroupTarget.name}`}
          subtitle="All staff in this department will inherit these security roles."
          footer={
            <>
              <button type="button" className="btn-executive-secondary" onClick={() => setAssignGroupTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn-executive-primary" onClick={handleAssignRolesToGroup}>
                Save Role Mappings
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roles.map((r) => {
              const isSelected = selectedRoleIdsForGroup.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRoleIdsForGroup((prev) =>
                      isSelected ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                    );
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    borderRadius: 6,
                    backgroundColor: isSelected ? '#e0f2fe' : '#ffffff',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                    }}
                  >
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Modal: Authorize / Approve Staff Member */}
      {approvingMember && (
        <Modal
          isOpen={Boolean(approvingMember)}
          onClose={() => setApprovingMember(null)}
          title={`Authorize Staff Member: ${approvingMember.fullName || approvingMember.username}`}
          subtitle="Assign an institutional department and security role to complete authorization."
          footer={
            <>
              <button
                type="button"
                className="btn-executive-secondary"
                onClick={() => setApprovingMember(null)}
                disabled={isSubmittingApproval}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-executive-primary"
                onClick={handleApproveMember}
                disabled={isSubmittingApproval}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmittingApproval ? 'Authorizing...' : 'Authorize Staff Member'}</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                Staff Member Name & Account
              </label>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600 }}>{approvingMember.fullName || 'Staff Member'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{approvingMember.username}</div>
                {approvingMember.email && (
                  <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>{approvingMember.email}</div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                Assign Initial Department (Optional)
              </label>
              <select
                value={approvalGroupId}
                onChange={(e) => setApprovalGroupId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
              >
                <option value="">No department assigned</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                Assign Initial Security Role
              </label>
              <select
                value={approvalRoleId}
                onChange={(e) => setApprovalRoleId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
              >
                <option value="">No direct role (department-inherited only)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isSystemTemplate ? '(Template)' : '(Custom)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
