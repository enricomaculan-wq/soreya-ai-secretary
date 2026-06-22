import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = (appJson.expo ?? config) as ExpoConfig;
  const easProjectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || process.env.EAS_PROJECT_ID?.trim() || undefined;

  return {
    ...baseConfig,
    extra: {
      ...baseConfig.extra,
      eas: {
        ...(typeof baseConfig.extra === "object" && baseConfig.extra && "eas" in baseConfig.extra
          ? (baseConfig.extra as { eas?: Record<string, unknown> }).eas
          : {}),
        projectId: easProjectId,
      },
    },
  };
};
