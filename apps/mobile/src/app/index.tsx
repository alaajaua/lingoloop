import { Redirect } from "expo-router";
import { useAuth } from "../services/auth-context";
import { Screen, Heading, Copy, Button } from "../components/auth-ui";
export default function Splash() {
  const auth = useAuth();
  if (auth.loading || auth.error)
    return (
      <Screen>
        <Heading>LingoLoop</Heading>
        <Copy>{auth.error ?? "로그인 상태를 확인하고 있어요."}</Copy>
        {auth.error && (
          <Button title="다시 시도" onPress={() => void auth.retry()} />
        )}
      </Screen>
    );
  return <Redirect href={auth.user ? "/account-ready" : "/welcome"} />;
}
