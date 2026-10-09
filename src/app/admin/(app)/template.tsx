/** Chaque page du back-office apparaît en fondu à la navigation (template = remonté à chaque page). */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
