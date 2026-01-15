"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useUserInfo from "@/app/(hooks)/useUserInfo";
import "./login.css";

export default function LoginPage() {
  const { loggedIn } = useUserInfo();
  const router = useRouter();

  const handleSSOLogin = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      window.open(`https://${host}/home`, "_blank");
    }
  };

  useEffect(() => {
    if (loggedIn === true) router.push("/");
  }, [loggedIn, router]);

  if (loggedIn === false) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome</h2>
            <p>
              You are not authenticated. Please sign in using SSO below then
              reload the page.
            </p>
          </div>

          <div className="login-actions">
            <button className="btn primary" onClick={handleSSOLogin}>
              Sign in with SSO
            </button>

            <button className="btn secondary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>

          <p className="login-help">
            Need help? Contact person who shared this App URL.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
