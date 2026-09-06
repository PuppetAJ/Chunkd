import { useState } from "react";
import { useNavigate } from "react-router";
import { useApolloClient, useMutation } from "@apollo/client/react";

import { DEMO_LOGIN } from "../utils/mutations.ts";
import { useAuthStore } from "./auth.ts";
import { requestErrorMessage } from "./credentials.ts";

/**
 * Sign in as the shared demo account.
 *
 * The auth pages and the landing page both offer this, and they present it
 * quite differently, so the behaviour lives here and each one supplies its own
 * button.
 */
export function useDemoLogin() {
  const logIn = useAuthStore((state) => state.logIn);
  const navigate = useNavigate();
  const apollo = useApolloClient();

  const [demoLogin, { loading }] = useMutation(DEMO_LOGIN);
  const [error, setError] = useState("");

  const startDemo = async () => {
    setError("");
    try {
      const { data } = await demoLogin();
      logIn((data as { demoLogin: { token: string } }).demoLogin.token);
      // Drop anything cached for the logged-out visitor, the same as a normal
      // sign-in does.
      await apollo.resetStore();
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    }
  };

  return { startDemo, loading, error };
}
