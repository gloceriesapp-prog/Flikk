// Re-mounts on every navigation, so each screen eases in instead of popping.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
