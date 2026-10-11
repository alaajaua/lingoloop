import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'LingoLoop Admin', description: 'LingoLoop 콘텐츠 관리 개발 환경' };
export default function Layout({children}: {children: ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }
