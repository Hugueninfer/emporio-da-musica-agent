import { ImageResponse } from "next/og";
import { PICK } from "@/components/brand/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone da tela inicial (iOS): símbolo completo, com o anel, sobre o mogno da marca. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#120B08" }}>
        <svg width="124" height="124" viewBox="0 0 100 100">
          <path d={PICK.path} fill="#FF7A45" />
          <circle cx={PICK.cx} cy={PICK.cy} r={PICK.hole} fill="#120B08" />
          <circle cx={PICK.cx} cy={PICK.cy} r={PICK.ring} fill="none" stroke="#120B08" strokeWidth={PICK.ringWidth} />
        </svg>
      </div>
    ),
    size,
  );
}
