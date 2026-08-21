const PageLoadingBar = ({ show = true, topClassName = "top-0", className = "" }) => {
  if (!show) return null;

  return (
    <div
      className={`fixed left-0 right-0 ${topClassName} z-[90] h-1 overflow-hidden bg-blue-100/80 ${className}`}
    >
      <div className="sf-loading-bar h-full w-1/2 rounded-full bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.55)]" />
    </div>
  );
};

export default PageLoadingBar;
