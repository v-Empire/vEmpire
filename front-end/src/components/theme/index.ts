import { PancakeTheme as PancakeCustomTheme } from "@pancakeswap-libs/uikit";
import { NavTheme } from "components/CustomMenu/types";
import { PancakeToggleTheme } from "components/PancakeToggle/types";
import { TooltipTheme } from "components/Tooltip/types";
import { Colors } from "./types";

export interface PancakeTheme extends Omit<PancakeCustomTheme, 'colors' | 'nav'> {
  colors: Colors;
  nav: NavTheme;
  pancakeToggle: PancakeToggleTheme;
  tooltip: TooltipTheme;
}

export { default as dark } from "./dark";
export { default as light } from "./light";

export { lightColors } from "./colors";
export { darkColors } from "./colors";
