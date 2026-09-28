export type EnvironmentMode = "development" | "staging" | "production";

export interface EnvironmentConfig {
  mode: EnvironmentMode;
  apiBaseUrl: string;
  enableDevAuth: boolean;
  enableVerboseLogging: boolean;
  sslPinningEnabled: boolean;
}

const ENVIRONMENTS: Record<EnvironmentMode, EnvironmentConfig> = {
  development: {
    mode: "development",
    apiBaseUrl: "http://127.0.0.1:8000",
    enableDevAuth: true,
    enableVerboseLogging: true,
    sslPinningEnabled: false,
  },
  staging: {
    mode: "staging",
    apiBaseUrl: "https://staging-api.cng-compliance.enterprise.internal",
    enableDevAuth: false,
    enableVerboseLogging: true,
    sslPinningEnabled: true,
  },
  production: {
    mode: "production",
    apiBaseUrl: "https://api.cng-compliance.enterprise.internal",
    enableDevAuth: false,
    enableVerboseLogging: false,
    sslPinningEnabled: true,
  },
};

// Environment profile selection (defaulting to development for local ADB reverse server)
export const CurrentEnvironment: EnvironmentConfig = ENVIRONMENTS["development"];

