import { useEffect } from "react";
import { router, Redirect } from "expo-router";
import { View } from "react-native";
import { Screen, Heading, Copy, Button, styles } from "../components/auth-ui";
import { analytics } from "../../services/analytics";
import { useAuth } from "../services/auth-context";
export default function Welcome() {
  const auth = useAuth();
  useEffect(() => {
    void analytics.track("welcome_viewed");
  }, []);
  if (auth.loading || auth.error) return <Redirect href="/" />;
  if (auth.user) return <Redirect href="/account-ready" />;
  return (
    <Screen>
      <Copy>LingoLoop</Copy>
      <Heading>오늘 필요한 영어만{"\n"}가볍게, 꾸준하게</Heading>
      <Copy>내 수준에 맞는 문제를 매일 자동으로 준비해요.</Copy>
      <View style={styles.card}>
        <Copy>짧게 배우고, 필요한 순간에 복습해요.</Copy>
      </View>
      <Button title="해리포터 단어 암기" onPress={() => router.push("/hp-cards")} />
      <Button title="단어 5개 암기해 보기" onPress={() => router.push("/practice")} />
      <View style={{ marginTop: "auto", gap: 12 }}>
        <Button
          title="시작하기"
          onPress={() => {
            void analytics.track("signup_cta_tapped");
            router.push("/signup");
          }}
        />
        <Button
          secondary
          title="이미 계정이 있나요? 로그인"
          onPress={() => {
            void analytics.track("login_cta_tapped");
            router.push("/login");
          }}
        />
      </View>
    </Screen>
  );
}
