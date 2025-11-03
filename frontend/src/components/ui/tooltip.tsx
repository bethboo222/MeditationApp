import * as React from "react";
export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return <span title={label}>{children}</span>;
}
