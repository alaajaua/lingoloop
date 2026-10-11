import { theme } from "@lingoloop/ui";
import type { CSSProperties } from "react";
import ContentManager from "../components/content-manager";
export default function Page() {
  const tokens = {
    "--bg": theme.bg.subtle,
    "--surface": theme.bg.default,
    "--text": theme.text.primary,
    "--muted": theme.text.secondary,
    "--border": theme.border.default,
    "--brand": theme.action.primary,
    "--tint": theme.bg.brand,
    "--inverse": theme.text.inverse,
    "--error": theme.feedback.error,
  } as CSSProperties;
  return (
    <main style={tokens}>
      <header>
        <p className="brand">LingoLoop / Admin</p>
        <h1>좋은 학습은 좋은 콘텐츠에서.</h1>
        <p>단어와 예문을 검토하고 학습에 사용할 콘텐츠를 관리하세요.</p>
      </header>
      <ContentManager />
    </main>
  );
}
