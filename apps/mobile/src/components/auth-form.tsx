import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "../services/auth-context";
import { Screen, Heading, Copy, Button, Field, styles } from "./auth-ui";
import { analytics } from "../../services/analytics";
export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const auth = useAuth();
  const lock = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const signup = mode === "signup";
  if (auth.loading || auth.error) return <Redirect href="/" />;
  if (auth.user) return <Redirect href="/account-ready" />;
  async function submit() {
    if (lock.current) return;
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 10 ||
      password.length > 128 ||
      (signup && !consent)
    ) {
      setError("이메일, 비밀번호(10~128자), 동의 항목을 확인해 주세요.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    void analytics.track(signup ? "signup_started" : "login_started");
    try {
      await auth.authenticate(mode, {
        email,
        password,
        ...(signup
          ? {
              termsAccepted: consent,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : {}),
      });
      void analytics.track(signup ? "signup_completed" : "login_completed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했어요.");
      void analytics.track(signup ? "signup_failed" : "login_failed");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading>{signup ? "가볍게 시작해요" : "다시 만나 반가워요"}</Heading>
      <Copy>
        {signup
          ? "이메일로 학습 계정을 만들어 주세요."
          : "이메일 계정으로 이어서 시작하세요."}
      </Copy>
      <Copy>Apple과 Google 로그인은 연결 준비 중입니다.</Copy>
      <Field
        label="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!busy}
      />
      <Field
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={signup ? "new-password" : "current-password"}
        editable={!busy}
        onSubmitEditing={() => void submit()}
      />
      <Copy>비밀번호는 10~128자로 입력해 주세요.</Copy>
      {signup && (
        <View style={styles.card}>
          <Copy>
            현재는 로컬 개발용 가입입니다. 이메일과 비밀번호 해시가 이 컴퓨터에
            저장됩니다. 실제 사용하는 비밀번호를 입력하지 마세요. 정식 서비스
            약관은 출시 전 제공됩니다.
          </Copy>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent, disabled: busy }}
            accessibilityLabel="개발용 데이터 저장 안내 확인"
            disabled={busy}
            onPress={() => setConsent(!consent)}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={styles.copy}>
              {consent ? "☑" : "☐"} 개발용 데이터 저장 안내를 확인했어요.
            </Text>
          </Pressable>
        </View>
      )}
      {error && <Copy error>{error}</Copy>}
      <Button
        title={signup ? "계정 만들기" : "로그인"}
        busy={busy}
        onPress={() => void submit()}
      />
      <Button
        secondary
        disabled={busy}
        title={signup ? "이미 계정이 있어요" : "처음이에요. 가입하기"}
        onPress={() => router.replace(signup ? "/login" : "/signup")}
      />
      {!signup && (
        <>
          <Button
            secondary
            title="비밀번호를 잊었나요?"
            onPress={() => setHelp(true)}
          />
          {help && (
            <Copy>
              개발용 계정의 비밀번호 복구는 아직 지원하지 않습니다. 다른 테스트
              이메일로 가입해 주세요.
            </Copy>
          )}
        </>
      )}
      <Button
        secondary
        disabled={busy}
        title="처음으로"
        onPress={() => router.replace("/welcome")}
      />
    </Screen>
  );
}
