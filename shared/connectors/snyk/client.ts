import {
  BaseConnector,
  BaseConnectorConfig,
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";

export type SnykSeverity = "critical" | "high" | "medium" | "low";
export type SnykProjectType =
  | "npm"
  | "pip"
  | "maven"
  | "gradle"
  | "nuget"
  | "gomodules"
  | "rubygems"
  | "composer"
  | "sbt"
  | "cocoapods"
  | "yarn"
  | "dockerfile"
  | "terraformconfig"
  | "cloudformationconfig"
  | "k8sconfig";

export type SnykIssueType = "vuln" | "license";
export type SnykFixType = "manual" | "upgrade" | "patch";

export interface SnykOrganization {
  id: string;
  name: string;
  slug: string;
  url: string;
  createdAt: string;
}

export interface SnykProject {
  id: string;
  name: string;
  origin: string;
  type: SnykProjectType;
  branch: string | null;
  targetReference: string | null;
  remoteRepoUrl: string | null;
  isMonitored: boolean;
  importingUserId: string;
  createdAt: string;
  lastTestedAt: string | null;
  issueCountsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalIssues: number;
}

export interface SnykIssue {
  id: string;
  issueType: SnykIssueType;
  pkgName: string;
  pkgVersion: string;
  title: string;
  severity: SnykSeverity;
  description: string;
  identifiers: {
    CVE?: string[];
    CWE?: string[];
    GHSA?: string[];
  };
  credit: string[];
  exploitMaturity:
    | "mature"
    | "proof-of-concept"
    | "no-known-exploit"
    | "no-data";
  semver: {
    vulnerable: string[];
    unaffected?: string[];
  };
  from: string[];
  upgradePath: string[];
  isUpgradable: boolean;
  isPatchable: boolean;
  isPinnable: boolean;
  isFixable: boolean;
  fixedIn: string[];
  introducedBy: string;
  publicationTime: string;
  disclosureTime: string | null;
  language: string;
  priorityScore: number;
  cvssScore: number | null;
  cvssVector: string | null;
}

export interface SnykIgnore {
  id: string;
  issueId: string;
  path: string;
  reason: string;
  reasonType: "temporary-ignore" | "permanent-ignore" | "not-vulnerable";
  created: string;
  expires: string | null;
  ignoredBy: SnykUser;
}

export interface SnykUser {
  id: string;
  name: string;
  email: string;
  username: string;
}

export interface SnykTestResult {
  ok: boolean;
  issuesCount: number;
  vulnerabilities: SnykIssue[];
  dependencyCount: number;
  packageManager: string;
  summary: string;
}

export interface SnykFixSuggestion {
  id: string;
  issueId: string;
  fixType: SnykFixType;
  packageName: string;
  currentVersion: string;
  fixedVersion: string | null;
  command: string | null;
  effort: "low" | "medium" | "high";
  isBreaking: boolean;
  description: string;
}

export interface SnykLicense {
  id: string;
  license: string;
  dependencies: string[];
  severity: SnykSeverity;
  instructions: string;
}

export interface SnykConnectorConfig extends BaseConnectorConfig {
  apiToken?: string;
  orgId?: string;
  apiUrl?: string;
}

export interface SnykConnector extends BaseConnector {
  listOrganizations(): Promise<ConnectorResult<SnykOrganization[]>>;

  listProjects(options?: {
    origin?: string;
    type?: SnykProjectType;
    isMonitored?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ projects: SnykProject[]; total: number }>>;

  getProject(projectId: string): Promise<ConnectorResult<SnykProject>>;

  deleteProject(projectId: string): Promise<ConnectorResult<void>>;

  listIssues(
    projectId: string,
    options?: {
      severity?: SnykSeverity[];
      type?: SnykIssueType;
      isUpgradable?: boolean;
      isFixable?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<ConnectorResult<{ issues: SnykIssue[]; total: number }>>;

  getIssue(
    projectId: string,
    issueId: string,
  ): Promise<ConnectorResult<SnykIssue>>;

  ignoreIssue(
    projectId: string,
    issueId: string,
    options: {
      reason: string;
      reasonType: "temporary-ignore" | "permanent-ignore" | "not-vulnerable";
      expires?: string;
      path?: string;
    },
  ): Promise<ConnectorResult<SnykIgnore>>;

  listIgnores(
    projectId: string,
  ): Promise<ConnectorResult<{ ignores: SnykIgnore[]; total: number }>>;

  deleteIgnore(
    projectId: string,
    ignoreId: string,
  ): Promise<ConnectorResult<void>>;

  testProject(projectId: string): Promise<ConnectorResult<SnykTestResult>>;

  getFixSuggestions(
    projectId: string,
    options?: { issueIds?: string[] },
  ): Promise<ConnectorResult<SnykFixSuggestion[]>>;

  listLicenseIssues(
    projectId: string,
  ): Promise<ConnectorResult<{ licenses: SnykLicense[]; total: number }>>;

  getProjectSbom(
    projectId: string,
    format?: "cyclonedx1.4+json" | "spdx2.3+json",
  ): Promise<ConnectorResult<object>>;
}

export function createSnykConnector(
  config: SnykConnectorConfig,
): SnykConnector {
  if (config.mode === "mock") {
    return new MockSnykConnector(config);
  }
  return new LiveSnykConnector(config);
}

class MockSnykConnector implements SnykConnector {
  readonly name = "snyk";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private organizations: SnykOrganization[] = [];
  private projects: SnykProject[] = [];
  private issues: Map<string, SnykIssue[]> = new Map();
  private ignores: Map<string, SnykIgnore[]> = new Map();
  private nextIgnoreId = 1;

  constructor(private config: SnykConnectorConfig) {
    this.seedMockData();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private seedMockData(): void {
    const now = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    this.organizations = [
      {
        id: "org-001",
        name: "Acme Corp",
        slug: "acme-corp",
        url: "https://app.snyk.io/org/acme-corp",
        createdAt: weekAgo,
      },
    ];

    this.projects = [
      {
        id: "proj-001",
        name: "frontend-app:package.json",
        origin: "github",
        type: "npm",
        branch: "main",
        targetReference: "main",
        remoteRepoUrl: "https://github.com/acme/frontend-app",
        isMonitored: true,
        importingUserId: "user-001",
        createdAt: weekAgo,
        lastTestedAt: now,
        issueCountsBySeverity: { critical: 2, high: 5, medium: 12, low: 8 },
        totalIssues: 27,
      },
      {
        id: "proj-002",
        name: "api-service:requirements.txt",
        origin: "github",
        type: "pip",
        branch: "main",
        targetReference: "main",
        remoteRepoUrl: "https://github.com/acme/api-service",
        isMonitored: true,
        importingUserId: "user-001",
        createdAt: weekAgo,
        lastTestedAt: dayAgo,
        issueCountsBySeverity: { critical: 1, high: 3, medium: 6, low: 4 },
        totalIssues: 14,
      },
      {
        id: "proj-003",
        name: "infra:Dockerfile",
        origin: "github",
        type: "dockerfile",
        branch: "main",
        targetReference: "main",
        remoteRepoUrl: "https://github.com/acme/infra",
        isMonitored: true,
        importingUserId: "user-001",
        createdAt: weekAgo,
        lastTestedAt: dayAgo,
        issueCountsBySeverity: { critical: 0, high: 2, medium: 3, low: 1 },
        totalIssues: 6,
      },
      {
        id: "proj-004",
        name: "backend-service:pom.xml",
        origin: "github",
        type: "maven",
        branch: "develop",
        targetReference: "develop",
        remoteRepoUrl: "https://github.com/acme/backend-service",
        isMonitored: false,
        importingUserId: "user-002",
        createdAt: weekAgo,
        lastTestedAt: null,
        issueCountsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        totalIssues: 0,
      },
    ];

    const frontendIssues: SnykIssue[] = [
      {
        id: "SNYK-JS-LODASH-1018905",
        issueType: "vuln",
        pkgName: "lodash",
        pkgVersion: "4.17.20",
        title: "Prototype Pollution",
        severity: "critical",
        description:
          "lodash prior to 4.17.21 is vulnerable to Prototype Pollution via the setWith and set functions.",
        identifiers: { CVE: ["CVE-2021-23337"], CWE: ["CWE-1321"] },
        credit: ["Security Researcher"],
        exploitMaturity: "proof-of-concept",
        semver: { vulnerable: ["<4.17.21"] },
        from: ["frontend-app@1.0.0", "lodash@4.17.20"],
        upgradePath: ["frontend-app@1.0.0", "lodash@4.17.21"],
        isUpgradable: true,
        isPatchable: false,
        isPinnable: false,
        isFixable: true,
        fixedIn: ["4.17.21"],
        introducedBy: "lodash@4.17.20",
        publicationTime: "2021-02-15T00:00:00Z",
        disclosureTime: "2021-02-15T00:00:00Z",
        language: "js",
        priorityScore: 856,
        cvssScore: 7.4,
        cvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N",
      },
      {
        id: "SNYK-JS-AXIOS-1038255",
        issueType: "vuln",
        pkgName: "axios",
        pkgVersion: "0.21.1",
        title: "Server-Side Request Forgery (SSRF)",
        severity: "critical",
        description:
          "axios prior to 0.21.2 is vulnerable to Server-Side Request Forgery.",
        identifiers: { CVE: ["CVE-2021-3749"], CWE: ["CWE-918"] },
        credit: ["Bug Hunter"],
        exploitMaturity: "mature",
        semver: { vulnerable: ["<0.21.2"] },
        from: ["frontend-app@1.0.0", "axios@0.21.1"],
        upgradePath: ["frontend-app@1.0.0", "axios@1.6.0"],
        isUpgradable: true,
        isPatchable: false,
        isPinnable: false,
        isFixable: true,
        fixedIn: ["0.21.2"],
        introducedBy: "axios@0.21.1",
        publicationTime: "2021-08-31T00:00:00Z",
        disclosureTime: "2021-08-31T00:00:00Z",
        language: "js",
        priorityScore: 912,
        cvssScore: 9.8,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      },
      {
        id: "SNYK-JS-MINIMIST-559764",
        issueType: "vuln",
        pkgName: "minimist",
        pkgVersion: "1.2.5",
        title: "Prototype Pollution",
        severity: "high",
        description:
          "minimist before 1.2.6 is vulnerable to Prototype Pollution.",
        identifiers: { CVE: ["CVE-2021-44906"], CWE: ["CWE-1321"] },
        credit: [],
        exploitMaturity: "proof-of-concept",
        semver: { vulnerable: ["<1.2.6"] },
        from: ["frontend-app@1.0.0", "mkdirp@0.5.5", "minimist@1.2.5"],
        upgradePath: ["frontend-app@1.0.0", "mkdirp@0.5.6", "minimist@1.2.6"],
        isUpgradable: true,
        isPatchable: false,
        isPinnable: false,
        isFixable: true,
        fixedIn: ["1.2.6"],
        introducedBy: "minimist@1.2.5",
        publicationTime: "2022-03-17T00:00:00Z",
        disclosureTime: "2022-03-17T00:00:00Z",
        language: "js",
        priorityScore: 684,
        cvssScore: 7.5,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
      },
      {
        id: "SNYK-JS-DICER-2311764",
        issueType: "vuln",
        pkgName: "dicer",
        pkgVersion: "0.3.0",
        title: "Denial of Service (DoS)",
        severity: "high",
        description:
          "dicer is vulnerable to Denial of Service due to improper handling of multipart data.",
        identifiers: { CVE: ["CVE-2022-24434"], CWE: ["CWE-400"] },
        credit: [],
        exploitMaturity: "no-known-exploit",
        semver: { vulnerable: ["<0.3.1"] },
        from: ["frontend-app@1.0.0", "busboy@0.3.1", "dicer@0.3.0"],
        upgradePath: [],
        isUpgradable: false,
        isPatchable: false,
        isPinnable: false,
        isFixable: false,
        fixedIn: [],
        introducedBy: "dicer@0.3.0",
        publicationTime: "2022-05-19T00:00:00Z",
        disclosureTime: "2022-05-19T00:00:00Z",
        language: "js",
        priorityScore: 534,
        cvssScore: 7.5,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
      },
      {
        id: "SNYK-JS-JSONWEBTOKEN-3180022",
        issueType: "vuln",
        pkgName: "jsonwebtoken",
        pkgVersion: "8.5.1",
        title: "Improper Restriction of Security Token Assignment",
        severity: "medium",
        description:
          "jsonwebtoken before 9.0.0 is vulnerable to Improper Restriction of Security Token Assignment.",
        identifiers: { CVE: ["CVE-2022-23539"], CWE: ["CWE-287"] },
        credit: [],
        exploitMaturity: "no-known-exploit",
        semver: { vulnerable: ["<9.0.0"] },
        from: ["frontend-app@1.0.0", "jsonwebtoken@8.5.1"],
        upgradePath: ["frontend-app@1.0.0", "jsonwebtoken@9.0.0"],
        isUpgradable: true,
        isPatchable: false,
        isPinnable: false,
        isFixable: true,
        fixedIn: ["9.0.0"],
        introducedBy: "jsonwebtoken@8.5.1",
        publicationTime: "2022-12-22T00:00:00Z",
        disclosureTime: "2022-12-22T00:00:00Z",
        language: "js",
        priorityScore: 456,
        cvssScore: 6.4,
        cvssVector: "CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:L/A:N",
      },
    ];

    const apiIssues: SnykIssue[] = [
      {
        id: "SNYK-PYTHON-PILLOW-1055461",
        issueType: "vuln",
        pkgName: "pillow",
        pkgVersion: "8.0.1",
        title: "Buffer Overflow",
        severity: "critical",
        description:
          "Pillow before 8.1.1 is vulnerable to Buffer Overflow in the JPEG 2000 decoder.",
        identifiers: { CVE: ["CVE-2021-25287"], CWE: ["CWE-120"] },
        credit: [],
        exploitMaturity: "proof-of-concept",
        semver: { vulnerable: ["<8.1.1"] },
        from: ["api-service@1.0.0", "pillow@8.0.1"],
        upgradePath: ["api-service@1.0.0", "pillow@9.5.0"],
        isUpgradable: true,
        isPatchable: false,
        isPinnable: false,
        isFixable: true,
        fixedIn: ["8.1.1"],
        introducedBy: "pillow@8.0.1",
        publicationTime: "2021-04-01T00:00:00Z",
        disclosureTime: "2021-04-01T00:00:00Z",
        language: "python",
        priorityScore: 789,
        cvssScore: 9.1,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:H",
      },
      {
        id: "SNYK-PYTHON-DJANGO-1279042",
        issueType: "vuln",
        pkgName: "django",
        pkgVersion: "3.1.6",
        title: "Directory Traversal",
        severity: "high",
        description:
          "Django before 3.1.9 is vulnerable to Directory Traversal via URLValidator.",
        identifiers: { CVE: ["CVE-2021-31542"], CWE: ["CWE-22"] },
        credit: [],
        exploitMaturity: "no-known-exploit",
        semver: { vulnerable: [">=3.1,<3.1.9"] },
        from: ["api-service@1.0.0", "django@3.1.6"],
        upgradePath: ["api-service@1.0.0", "django@4.2.0"],
        isUpgradable: true,
        isPatchable: false,
        isPinnable: false,
        isFixable: true,
        fixedIn: ["3.1.9"],
        introducedBy: "django@3.1.6",
        publicationTime: "2021-05-04T00:00:00Z",
        disclosureTime: "2021-05-04T00:00:00Z",
        language: "python",
        priorityScore: 612,
        cvssScore: 7.5,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
      },
    ];

    const dockerIssues: SnykIssue[] = [
      {
        id: "SNYK-DEBIAN11-OPENSSL-3314313",
        issueType: "vuln",
        pkgName: "openssl",
        pkgVersion: "1.1.1k-1+deb11u1",
        title: "NULL Pointer Dereference",
        severity: "high",
        description:
          "OpenSSL is vulnerable to NULL Pointer Dereference when parsing certain PKCS7 data.",
        identifiers: { CVE: ["CVE-2023-0401"], CWE: ["CWE-476"] },
        credit: [],
        exploitMaturity: "no-known-exploit",
        semver: { vulnerable: ["<1.1.1t-1+deb11u1"] },
        from: ["infra@1.0.0", "openssl@1.1.1k-1+deb11u1"],
        upgradePath: [],
        isUpgradable: false,
        isPatchable: false,
        isPinnable: false,
        isFixable: false,
        fixedIn: ["1.1.1t-1+deb11u1"],
        introducedBy: "openssl@1.1.1k-1+deb11u1",
        publicationTime: "2023-02-07T00:00:00Z",
        disclosureTime: "2023-02-07T00:00:00Z",
        language: "linux",
        priorityScore: 489,
        cvssScore: 7.5,
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
      },
    ];

    this.issues.set("proj-001", frontendIssues);
    this.issues.set("proj-002", apiIssues);
    this.issues.set("proj-003", dockerIssues);
    this.issues.set("proj-004", []);
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return success({
      healthy: true,
      version: "mock-v1",
      details: {
        mode: "mock",
        projectCount: this.projects.length,
        orgCount: this.organizations.length,
      },
    });
  }

  async listOrganizations(): Promise<ConnectorResult<SnykOrganization[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    return success(this.organizations);
  }

  async listProjects(options?: {
    origin?: string;
    type?: SnykProjectType;
    isMonitored?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ projects: SnykProject[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.projects];

    if (options?.origin) {
      filtered = filtered.filter((p) => p.origin === options.origin);
    }
    if (options?.type) {
      filtered = filtered.filter((p) => p.type === options.type);
    }
    if (options?.isMonitored !== undefined) {
      filtered = filtered.filter((p) => p.isMonitored === options.isMonitored);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    return success({ projects: paged, total: filtered.length });
  }

  async getProject(projectId: string): Promise<ConnectorResult<SnykProject>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    return success(project);
  }

  async deleteProject(projectId: string): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const index = this.projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    this.projects.splice(index, 1);
    this.issues.delete(projectId);
    this.ignores.delete(projectId);

    return success(undefined);
  }

  async listIssues(
    projectId: string,
    options?: {
      severity?: SnykSeverity[];
      type?: SnykIssueType;
      isUpgradable?: boolean;
      isFixable?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<ConnectorResult<{ issues: SnykIssue[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const projectIssues = this.issues.get(projectId);
    if (!projectIssues) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    let filtered = [...projectIssues];

    if (options?.severity?.length) {
      filtered = filtered.filter((i) => options.severity!.includes(i.severity));
    }
    if (options?.type) {
      filtered = filtered.filter((i) => i.issueType === options.type);
    }
    if (options?.isUpgradable !== undefined) {
      filtered = filtered.filter(
        (i) => i.isUpgradable === options.isUpgradable,
      );
    }
    if (options?.isFixable !== undefined) {
      filtered = filtered.filter((i) => i.isFixable === options.isFixable);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    return success({ issues: paged, total: filtered.length });
  }

  async getIssue(
    projectId: string,
    issueId: string,
  ): Promise<ConnectorResult<SnykIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const projectIssues = this.issues.get(projectId);
    if (!projectIssues) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    const issue = projectIssues.find((i) => i.id === issueId);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue ${issueId} not found`,
      });
    }

    return success(issue);
  }

  async ignoreIssue(
    projectId: string,
    issueId: string,
    options: {
      reason: string;
      reasonType: "temporary-ignore" | "permanent-ignore" | "not-vulnerable";
      expires?: string;
      path?: string;
    },
  ): Promise<ConnectorResult<SnykIgnore>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    if (!this.issues.has(projectId)) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    const ignore: SnykIgnore = {
      id: `ignore-${this.nextIgnoreId++}`,
      issueId,
      path: options.path || "*",
      reason: options.reason,
      reasonType: options.reasonType,
      created: new Date().toISOString(),
      expires: options.expires || null,
      ignoredBy: {
        id: "user-001",
        name: "Alice Engineer",
        email: "alice@example.com",
        username: "alice.engineer",
      },
    };

    const projectIgnores = this.ignores.get(projectId) || [];
    projectIgnores.push(ignore);
    this.ignores.set(projectId, projectIgnores);

    return success(ignore);
  }

  async listIgnores(
    projectId: string,
  ): Promise<ConnectorResult<{ ignores: SnykIgnore[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    if (!this.issues.has(projectId)) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    const ignores = this.ignores.get(projectId) || [];
    return success({ ignores, total: ignores.length });
  }

  async deleteIgnore(
    projectId: string,
    ignoreId: string,
  ): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const projectIgnores = this.ignores.get(projectId);
    if (!projectIgnores) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    const index = projectIgnores.findIndex((i) => i.id === ignoreId);
    if (index === -1) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Ignore ${ignoreId} not found`,
      });
    }

    projectIgnores.splice(index, 1);
    return success(undefined);
  }

  async testProject(
    projectId: string,
  ): Promise<ConnectorResult<SnykTestResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    const issues = this.issues.get(projectId) || [];

    return success({
      ok: issues.length === 0,
      issuesCount: issues.length,
      vulnerabilities: issues,
      dependencyCount: 150,
      packageManager: project.type,
      summary: `Tested ${project.name}: ${issues.length} vulnerabilities found`,
    });
  }

  async getFixSuggestions(
    projectId: string,
    options?: { issueIds?: string[] },
  ): Promise<ConnectorResult<SnykFixSuggestion[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const projectIssues = this.issues.get(projectId);
    if (!projectIssues) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    let fixableIssues = projectIssues.filter((i) => i.isFixable);
    if (options?.issueIds?.length) {
      fixableIssues = fixableIssues.filter((i) =>
        options.issueIds!.includes(i.id),
      );
    }

    const suggestions: SnykFixSuggestion[] = fixableIssues.map((issue) => ({
      id: `fix-${issue.id}`,
      issueId: issue.id,
      fixType: issue.isUpgradable ? "upgrade" : "manual",
      packageName: issue.pkgName,
      currentVersion: issue.pkgVersion,
      fixedVersion: issue.fixedIn[0] || null,
      command: issue.isUpgradable ? this.getUpgradeCommand(issue) : null,
      effort: issue.isUpgradable ? "low" : "medium",
      isBreaking: this.isBreakingChange(issue),
      description: `Upgrade ${issue.pkgName} to ${issue.fixedIn[0] || "latest"} to fix ${issue.title}`,
    }));

    return success(suggestions);
  }

  private getUpgradeCommand(issue: SnykIssue): string {
    const fixVersion = issue.fixedIn[0] || "latest";
    switch (issue.language) {
      case "js":
        return `npm install ${issue.pkgName}@${fixVersion}`;
      case "python":
        return `pip install ${issue.pkgName}>=${fixVersion}`;
      default:
        return `Upgrade ${issue.pkgName} to ${fixVersion}`;
    }
  }

  private isBreakingChange(issue: SnykIssue): boolean {
    const current = issue.pkgVersion.split(".")[0];
    const fixed = issue.fixedIn[0]?.split(".")[0];
    return current !== fixed;
  }

  async listLicenseIssues(
    projectId: string,
  ): Promise<ConnectorResult<{ licenses: SnykLicense[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    if (!this.issues.has(projectId)) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    const licenses: SnykLicense[] = [
      {
        id: "license-001",
        license: "GPL-3.0",
        dependencies: ["some-gpl-lib@1.0.0"],
        severity: "high",
        instructions:
          "GPL-3.0 requires derivative works to be open-sourced under the same license.",
      },
    ];

    return success({ licenses, total: licenses.length });
  }

  async getProjectSbom(
    projectId: string,
    _format?: "cyclonedx1.4+json" | "spdx2.3+json",
  ): Promise<ConnectorResult<object>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${projectId} not found`,
      });
    }

    return success({
      bomFormat: "CycloneDX",
      specVersion: "1.4",
      serialNumber: `urn:uuid:${projectId}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        component: {
          name: project.name,
          version: "1.0.0",
          type: "application",
        },
      },
      components: [
        { name: "lodash", version: "4.17.20", type: "library" },
        { name: "axios", version: "0.21.1", type: "library" },
      ],
    });
  }
}

class LiveSnykConnector implements SnykConnector {
  readonly name = "snyk";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: SnykConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (!this.config.apiToken) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "Snyk API token is required for live mode",
      });
    }
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async listOrganizations(): Promise<ConnectorResult<SnykOrganization[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async listProjects(): Promise<
    ConnectorResult<{ projects: SnykProject[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async getProject(): Promise<ConnectorResult<SnykProject>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async deleteProject(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async listIssues(): Promise<
    ConnectorResult<{ issues: SnykIssue[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async getIssue(): Promise<ConnectorResult<SnykIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async ignoreIssue(): Promise<ConnectorResult<SnykIgnore>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async listIgnores(): Promise<
    ConnectorResult<{ ignores: SnykIgnore[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async deleteIgnore(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async testProject(): Promise<ConnectorResult<SnykTestResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async getFixSuggestions(): Promise<ConnectorResult<SnykFixSuggestion[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async listLicenseIssues(): Promise<
    ConnectorResult<{ licenses: SnykLicense[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }

  async getProjectSbom(): Promise<ConnectorResult<object>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Snyk connector not yet implemented",
    });
  }
}
