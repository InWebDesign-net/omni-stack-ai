let originalFaviconUrl: string | null = null;

export function updateFaviconBadge(unreadCount: number) {
  if (typeof window === 'undefined') return;

  const favicon = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || null;
  if (!favicon) return;

  if (!originalFaviconUrl) {
    originalFaviconUrl = favicon.href;
  }

  if (unreadCount <= 0) {
    if (originalFaviconUrl) {
      favicon.href = originalFaviconUrl;
    }
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = originalFaviconUrl;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw original icon
    ctx.drawImage(img, 0, 0, 32, 32);

    // Draw red notification badge circle at top-right
    const r = 9;
    const cx = 23;
    const cy = 9;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#ef4444'; // Red-500
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw text count inside badge
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = unreadCount > 9 ? '9+' : String(unreadCount);
    ctx.fillText(text, cx, cy + 0.5);

    favicon.href = canvas.toDataURL('image/png');
  };
}
