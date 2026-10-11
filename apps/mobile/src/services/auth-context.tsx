import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@lingoloop/types";
import * as session from "./session";
type State = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  authenticate: (mode: "signup" | "login", data: unknown) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function retry() {
    setLoading(true);
    setError(null);
    try {
      setUser(await session.restore());
    } catch (e) {
      setError(e instanceof Error ? e.message : "세션 확인에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void retry();
  }, []);
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        retry,
        authenticate: async (mode, data) => {
          setUser(await session.authenticate(mode, data));
        },
        logout: async () => {
          await session.logout();
          setUser(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
