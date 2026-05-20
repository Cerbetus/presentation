export default function Footer() {
  const version = "0.0.2";

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span>Cerbets TM 2026</span>
        <span className="muted text-xs">
          Government terms: Use must follow applicable security, privacy, and records policies.
        </span>
        <span className="muted text-xs">Version v{version}</span>
      </div>
    </footer>
  );
}
