import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { hasLocalAuthSession, useAppStore } from "@/stores/app-store";
import { useRealtimeInvalidator } from "@/hooks/use-realtime-invalidator";
import { usePrefs } from "@/lib/profile-prefs";
import { ThemeInjector } from "@/components/site/ThemeInjector";
import { SingleSessionGuard } from "@/components/auth/SingleSessionGuard";
import { SessionTimeoutGuard } from "@/components/auth/SessionTimeoutGuard";
import { ActivityTracker } from "@/components/tracking/ActivityTracker";



import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CA Aspire BD — Professional ICAB & Chartered Accountancy Learning Platform" },
      { name: "description", content: "CA Aspire BD — Professional CA learning platform for ICAB students with MCQ practice, mock tests, quizzes, flash cards, notes, analytics and performance tracking across Financial Accounting, Audit, Taxation and Business Law." },
      { name: "keywords", content: "CA Aspire BD, ICAB, Chartered Accountancy, CA exam preparation, CA MCQ practice, CA mock test, Financial Accounting, Audit, Taxation, Business Law, Financial Reporting, Management Accounting, CA Bangladesh" },
      { name: "author", content: "CA Aspire BD" },
      { property: "og:title", content: "CA Aspire BD — ICAB & Chartered Accountancy Learning Platform" },
      { property: "og:description", content: "Professional CA learning platform for ICAB students — MCQ practice, mock tests, flash cards, notes & analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_INIT_SCRIPT = `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('edumaster.theme')==='dark');}catch(e){document.documentElement.classList.remove('dark');}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInjector />
      <RootInner />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>

  );
}

const AUTH_ROUTES = ["/login", "/signup", "/register", "/admin/login", "/forgot-password", "/reset-password", "/email-verified"];
const STUDENT_ROUTES = ["/dashboard", "/mcq-practice", "/quiz", "/custom-exam", "/mock-test", "/flash-cards", "/short-notes", "/qns-bank", "/classes", "/notifications", "/profile", "/bookmarks", "/wrong-questions"];

function RootInner() {
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hydrate, user, authVersion } = useAppStore();
  const lastAuthVersion = useRef(authVersion);

  // Apply user prefs (accent color, font size) to <html> on every mount.
  usePrefs();

  // Must be inside QueryClientProvider — uses useQueryClient internally.
  useRealtimeInvalidator(Boolean(user));

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (authVersion === lastAuthVersion.current) return;
    lastAuthVersion.current = authVersion;
    console.debug("[auth] global refresh", { authVersion, hasUser: !!user });
    queryClient.invalidateQueries();
    void router.invalidate();
    (router as unknown as { refresh?: () => void }).refresh?.();
  }, [authVersion, queryClient, router, user]);

  const path = location.pathname;
  // /admin/login is a PUBLIC admin sign-in page — it must not be treated as a
  // protected admin route (otherwise unauthenticated visitors get bounced).
  const isAdminLogin = path === "/admin/login";
  const isAdminRoute = !isAdminLogin && (path === "/admin" || path.startsWith("/admin/"));
  const isStudentRoute = STUDENT_ROUTES.includes(path);

  const hasPersistedSession = useMemo(() => {
    return hasLocalAuthSession();
  }, [path, user]);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (user && AUTH_ROUTES.includes(path)) {
      return user.role === "admin" ? "/admin" : "/dashboard";
    }
    if (!hasPersistedSession && (isAdminRoute || isStudentRoute)) return "/login";
    if (user && isAdminRoute && user.role !== "admin") return "/dashboard";
    return null;
  }, [path, user, isAdminRoute, isStudentRoute, hasPersistedSession]);

  if (redirectTo) return <Navigate to={redirectTo as never} replace />;
  return (
    // Empty fallback: route chunks preload on link hover (defaultPreload: "intent"),
    // so navigation almost never suspends. Avoiding a full-screen spinner here
    // prevents the "black screen during route change" flicker.
    <Suspense fallback={null}>
      <SingleSessionGuard />
      <SessionTimeoutGuard />
      <ActivityTracker />
      <Outlet />
    </Suspense>
  );
}
