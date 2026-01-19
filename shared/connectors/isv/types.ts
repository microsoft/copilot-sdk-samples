import {
  BaseConnector,
  BaseConnectorConfig,
  ConnectorResult,
  ConnectorMode,
} from "../types.js";

export interface ISVConnectorConfig extends BaseConnectorConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface ISVConnector extends BaseConnector {
  readonly vendor: string;
}

export type ISVConnectorFactory<
  TConfig extends ISVConnectorConfig,
  TConnector extends ISVConnector,
> = (config: TConfig) => TConnector;

export abstract class BaseISVConnector implements ISVConnector {
  abstract readonly name: string;
  abstract readonly vendor: string;
  readonly mode: ConnectorMode;
  protected _isInitialized = false;

  constructor(protected config: ISVConnectorConfig) {
    this.mode = config.mode;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  abstract initialize(): Promise<ConnectorResult<void>>;
  abstract dispose(): Promise<void>;
  abstract healthCheck(): Promise<
    ConnectorResult<import("../types.js").HealthCheckResponse>
  >;
}
