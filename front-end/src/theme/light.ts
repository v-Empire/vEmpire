import { DefaultTheme } from "styled-components";
import { light } from "@pancakeswap-libs/uikit";
import base from "./base";
import { lightColors } from "./colors";

const lightTheme: DefaultTheme = {
  ...base,
  ...light,
  colors: lightColors,
};

export default lightTheme;
