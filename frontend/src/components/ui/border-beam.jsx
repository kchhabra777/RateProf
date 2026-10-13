import React from "react";

export const BorderBeam = ({
  size = 140,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = "#ec4899",
  colorTo = "#a855f7",
  className = "",
  style = {}
}) => {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        padding: `${borderWidth}px`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
        ...style
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "250%",
          height: "250%",
          transform: "translate(-50%, -50%)",
          background: `conic-gradient(from 0deg, transparent 0deg 280deg, ${colorFrom} 330deg, ${colorTo} 360deg)`,
          animation: `borderBeamSpin ${duration}s linear infinite`,
        }}
      />
    </div>
  );
};

export default BorderBeam;
