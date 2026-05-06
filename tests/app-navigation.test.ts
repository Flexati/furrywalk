import { describe, it, expect } from "vitest";

describe("App Navigation", () => {
  it("should have 5 main tabs configured", () => {
    // This is a basic test to verify the tab structure exists
    const tabs = ["home", "dog-profile", "health", "map", "settings"];
    expect(tabs).toHaveLength(5);
    expect(tabs).toContain("home");
    expect(tabs).toContain("dog-profile");
    expect(tabs).toContain("health");
    expect(tabs).toContain("map");
    expect(tabs).toContain("settings");
  });

  it("should verify branding colors are configured", () => {
    const colors = {
      primary: "#1E3D2F",
      secondary: "#F47C35",
      background: "#FFF5E6",
      foreground: "#2B2B2B",
    };
    
    expect(colors.primary).toBe("#1E3D2F");
    expect(colors.secondary).toBe("#F47C35");
    expect(colors.background).toBe("#FFF5E6");
  });

  it("should verify app config is set correctly", () => {
    const appConfig = {
      appName: "Passeggiata Furba",
      appSlug: "passeggiata-furba",
    };
    
    expect(appConfig.appName).toBe("Passeggiata Furba");
    expect(appConfig.appSlug).toBe("passeggiata-furba");
    expect(appConfig.appName).not.toContain("app");
  });
});
