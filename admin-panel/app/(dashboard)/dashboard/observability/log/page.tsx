"use client";
import { useTheme } from "next-themes";

export default function ApplicationPage() {

  const { theme } = useTheme();
  const grafanaTheme = theme === "light" ? "light" : "dark";

  return (
    <div className="h-screen w-full">
      <iframe
        src={`http://localhost:3002/d/ad9hlxw/logs?orgId=1&kiosk&&theme=${grafanaTheme}`}
        className="h-full w-full border-0"
      />
    </div>
  )
}