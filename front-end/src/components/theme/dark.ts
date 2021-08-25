import { DefaultTheme } from "styled-components";
import { dark } from "@pancakeswap-libs/uikit";
import base from "./base";
import { darkColors } from "./colors";

const darkTheme: DefaultTheme = {
  ...base,
  ...dark,
  colors: darkColors,
};

export default darkTheme;
