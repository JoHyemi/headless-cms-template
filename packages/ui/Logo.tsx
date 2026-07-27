// 헤더/사이드바에서 쓰는 브랜드 아이콘. app/icon.svg(파비콘)와 같은 디자인입니다.
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="7" fill="#3d5afe" />
      <rect x="7" y="8" width="18" height="5" rx="2.5" fill="#ffffff" />
      <rect x="7" y="16" width="18" height="3.5" rx="1.75" fill="#ffffff" fillOpacity="0.85" />
      <rect x="7" y="22" width="11" height="3.5" rx="1.75" fill="#ffffff" fillOpacity="0.85" />
    </svg>
  );
}
