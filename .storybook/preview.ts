import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0c0c0f" },
        { name: "surface", value: "#161618" },
      ],
    },
  },
  tags: ["autodocs"],
};

export default preview;
