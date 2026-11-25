/**
 * Master Navigation Registry for My School Care Unified AppShell.
 * Implements 3-tier dynamic filtering:
 * Tier 1 (Platform Subscriptions) + Tier 2 (School Head Enabled Toggles) + Tier 3 (User RBAC Permissions).
 */

export interface NavItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  appCode: string;
  category?: string;
  requiredPermission?: string;
  badge?: string;
  children?: NavItem[];
}

export const MASTER_NAVIGATION: NavItem[] = [
  {
    id: 'home',
    label: 'Overview & Home',
    path: '/',
    iconName: 'BookOpen',
    appCode: 'PUBLIC',
    category: 'Workspace',
  },
  {
    id: 'students',
    label: 'Student Workspace',
    path: '/students',
    iconName: 'BookOpen',
    appCode: 'STUDENT_MANAGEMENT',
    category: 'Academics',
    requiredPermission: 'student:read',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: '/attendance',
    iconName: 'CalendarCheck',
    appCode: 'ATTENDANCE',
    category: 'Operations',
    requiredPermission: 'attendance:mark',
  },
  {
    id: 'examinations',
    label: 'Examinations',
    path: '/examinations',
    iconName: 'Award',
    appCode: 'EXAMINATION',
    category: 'Academics',
    requiredPermission: 'exam:manage',
  },
  {
    id: 'finance',
    label: 'Fee & Billing',
    path: '/finance',
    iconName: 'CreditCard',
    appCode: 'FINANCE',
    category: 'Finance',
    requiredPermission: 'finance:read',
  },
  {
    id: 'iam',
    label: 'School Head Admin',
    path: '/{slug}/admin',
    iconName: 'Users',
    appCode: 'IAM_GOVERNANCE',
    category: 'Governance & IAM',
    requiredPermission: 'rbac:manage',
  },
  {
    id: 'platform',
    label: 'Platform Control',
    path: '/platform',
    iconName: 'Sliders',
    appCode: 'PLATFORM_CONTROL',
    category: 'Platform SuperAdmin',
  },
];

export interface CurrentUserContext {
  userId?: number;
  username?: string;
  fullName?: string;
  role?: string;
  isSuperAdmin?: boolean;
  authorizedApplications?: string[];
  permissions?: string[];
}

/**
 * Pure recursive filter evaluating Master Navigation against active user and tenant capabilities.
 */
export function filterNavigation(
  items: NavItem[],
  user: CurrentUserContext | null,
  currentOrgSlug?: string
): NavItem[] {
  // If not logged in (guest), show public landing items
  if (!user) {
    return items
      .filter((item) => item.appCode === 'PUBLIC')
      .map((item) => resolveRoute(item, currentOrgSlug));
  }

  const isSuper = Boolean(
    user.isSuperAdmin ||
    user.role === 'PLATFORM_SUPER_ADMIN' ||
    user.username === 'superadmin'
  );

  // 1. SuperAdmin Persona: Exclusively Platform Control
  if (isSuper) {
    return items
      .filter((item) => item.appCode === 'PLATFORM_CONTROL')
      .map((item) => resolveRoute(item, currentOrgSlug));
  }

  // 2. School Personas (Principal, Teachers, Staff):
  // Strictly filter by Tier 1 & 2 (authorizedApplications) and Tier 3 (permissions)
  const authorizedSet = new Set(user.authorizedApplications || []);
  const permSet = new Set(user.permissions || []);
  const isSchoolAdmin = (user.role && (
    user.role.toUpperCase().includes('ADMIN') ||
    user.role.toUpperCase().includes('PRINCIPAL') ||
    user.role.toUpperCase().includes('HEAD_MASTER') ||
    user.role.toUpperCase().includes('HEADMASTER')
  )) || permSet.has('rbac:manage');

  return items
    .filter((item) => {
      // Never show platform control to school users
      if (item.appCode === 'PLATFORM_CONTROL') {
        return false;
      }

      // Always allow public workspace navigation
      if (item.appCode === 'PUBLIC') {
        return true;
      }

      // Tier 1 & 2 Check: School must have licensed and enabled this application
      if (!authorizedSet.has(item.appCode)) {
        return false;
      }

      // Tier 3 Check: School Admins see all school-enabled modules; staff members require granular permission
      if (!isSchoolAdmin && item.requiredPermission && !permSet.has(item.requiredPermission)) {
        return false;
      }

      return true;
    })
    .map((item) => {
      const resolved = resolveRoute(item, currentOrgSlug);
      if (resolved.children && resolved.children.length > 0) {
        resolved.children = filterNavigation(resolved.children, user, currentOrgSlug);
      }
      return resolved;
    })
    .filter((item) => !item.children || item.children.length > 0);
}

function resolveRoute(item: NavItem, slug?: string): NavItem {
  let targetPath = item.path;
  if (slug && targetPath.includes('{slug}')) {
    targetPath = targetPath.replace('{slug}', slug);
  }
  return { ...item, path: targetPath };
}
