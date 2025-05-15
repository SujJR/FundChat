import { createSystem, defaultConfig } from "@chakra-ui/react";

// Create a simple custom system with default configuration
export const system = createSystem({
  // Use all the default settings
  ...defaultConfig,
  // Ensure this is not undefined
  cssVarsRoot: ":host, :root",
  // Add a small theme customization to verify it works
  theme: {
    ...defaultConfig.theme,
    tokens: {
      ...defaultConfig.theme?.tokens,
      colors: {
        ...defaultConfig.theme?.tokens?.colors,
        blue: {
          50: { value: "#ebf8ff" },
          100: { value: "#bee3f8" },
          200: { value: "#90cdf4" },
          300: { value: "#63b3ed" },
          400: { value: "#4299e1" },
          500: { value: "#3182ce" },
          600: { value: "#2b6cb0" },
          700: { value: "#2c5282" },
          800: { value: "#2a4365" },
          900: { value: "#1A365D" },
          950: { value: "#0f2942" }
        }
      }
    }
  }
});

// Export for use in provider
export default system; 