import type { Metadata } from "next";
export const metadata: Metadata = { title: "LingoLoop 단어 암기", description: "해리포터 대사로 기억하는 영어 단어" };
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
