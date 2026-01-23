export interface Connector {
  id: string;
  name: string;
  description: string;
  status: "implemented" | "planned";
  paths: {
    client?: string;
    mock?: string;
  };
}

export interface Tier {
  name: string;
  priority: number;
  description: string;
}

export interface TierInfo {
  [key: string]: Tier;
}

export interface Catalog {
  version: string;
  repositoryUrl?: string;
  demos: Demo[];
  connectors: Connector[];
  tiers: TierInfo;
}

export type SampleType = "sdk" | "ghaw" | "both";

export type TierFilter = "all" | "dev" | "isv";

export interface Demo {
  id: string;
  name: string;
  description: string;
  tier: TierKey;
  status: "implemented" | "planned";
  features: {
    sdk: boolean;
    ghaw: boolean;
  };
  paths: {
    sdk?: string;
    ghaw?: string;
  };
  dependencies: string[];
  connectors: string[];
  type?: SampleType;
  audience?: string;
  timeToValue?: string;
  featured?: boolean;
}

export type TierKey = "mandatory" | "isv-tier-1" | "isv-tier-2";
