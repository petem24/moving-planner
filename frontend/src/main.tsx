import { Component, StrictMode, useMemo, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignIn, SignOutButton, useAuth } from "@clerk/react";
import {
  Authenticated,
  AuthLoading,
  ConvexProvider,
  ConvexReactClient,
  Unauthenticated,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PublicMarketplace } from "./components/marketplace/public-marketplace";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-sm text-muted-foreground">
      {children}
    </main>
  );
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Authenticated application error", error, info);
  }

  render() {
    if (this.state.error) {
      const forbidden = this.state.error.message.includes("Forbidden");

      return (
        <FullPageMessage>
          <div className="flex max-w-md flex-col items-center gap-4">
            <h1 className="font-display text-xl text-foreground">
              {forbidden ? "This account does not have access" : "Unable to load the move planner"}
            </h1>
            <p>
              {forbidden
                ? "Sign in with one of the two permitted email addresses."
                : "Please reload the page. If the problem continues, check the browser console."}
            </p>
            <SignOutButton>
              <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" type="button">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </FullPageMessage>
      );
    }

    return this.props.children;
  }
}

function AuthenticatedApp({ convexUrl }: { convexUrl: string }) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthLoading>
        <FullPageMessage>Checking your session…</FullPageMessage>
      </AuthLoading>
      <Unauthenticated>
        <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
          <SignIn routing="hash" withSignUp={false} />
        </main>
      </Unauthenticated>
      <Authenticated>
        <AppErrorBoundary>
          <BrowserRouter>
            <App convexEnabled showAccountMenu />
          </BrowserRouter>
        </AppErrorBoundary>
      </Authenticated>
    </ConvexProviderWithClerk>
  );
}

let content: ReactNode;

if (window.location.pathname.startsWith("/marketplace")) {
  content = convexUrl ? (
    <ConvexProvider client={new ConvexReactClient(convexUrl)}>
      <BrowserRouter><PublicMarketplace enabled /></BrowserRouter>
    </ConvexProvider>
  ) : (
    <BrowserRouter><PublicMarketplace enabled={false} /></BrowserRouter>
  );
} else if (convexUrl && clerkPublishableKey) {
  content = (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <AuthenticatedApp convexUrl={convexUrl} />
    </ClerkProvider>
  );
} else if (convexUrl || clerkPublishableKey) {
  content = (
    <FullPageMessage>
      Authentication is not fully configured. Set both VITE_CONVEX_URL and
      VITE_CLERK_PUBLISHABLE_KEY.
    </FullPageMessage>
  );
} else {
  content = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{content}</StrictMode>,
);
