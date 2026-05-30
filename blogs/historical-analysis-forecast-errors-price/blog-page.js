const dashboardFrame = document.getElementById("forecast-error-dashboard-frame");

const resizeDashboardFrame = () => {
    if (!dashboardFrame) return;
    try {
        const frameDocument = dashboardFrame.contentWindow?.document;
        if (!frameDocument) return;
        const nextHeight = Math.max(
            frameDocument.documentElement?.scrollHeight ?? 0,
            frameDocument.body?.scrollHeight ?? 0,
            860
        );
        dashboardFrame.style.height = `${nextHeight}px`;
    } catch (error) {
        // Same-origin in production; silent fallback keeps the default min-height.
    }
};

dashboardFrame?.addEventListener("load", () => {
    resizeDashboardFrame();
    setTimeout(resizeDashboardFrame, 120);
});

window.addEventListener("resize", resizeDashboardFrame);
