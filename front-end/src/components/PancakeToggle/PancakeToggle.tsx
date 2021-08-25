import React from "react";
import { PancakeStack, PancakeInput, PancakeLabel } from "./StyledPancakeToggle";
import { PancakeToggleProps, scales } from "./types";

const PancakeToggle: React.FC<PancakeToggleProps> = ({ checked, scale = scales.MD, ...props }) => {

  const { id } = props;

  return (
    <PancakeStack scale={scale}>
      <PancakeInput id={id || "pancake-toggle"} scale={scale} type="checkbox" checked={checked} {...props} />
      <PancakeLabel scale={scale} checked={checked} htmlFor={id || "pancake-toggle"}>
        <div className="pancakes">
          <div className="pancake" />
          <div className="pancake" />
          <div className="pancake" />
          <div className="butter" />
        </div>
      </PancakeLabel>
    </PancakeStack>
  )
};

PancakeToggle.defaultProps = {
  scale: scales.MD,
};

export default PancakeToggle;
