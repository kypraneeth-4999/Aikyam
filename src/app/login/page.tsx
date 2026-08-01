import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

/**
 * `?error=` is set by /auth/callback when the OAuth round-trip fails, so the
 * reason is shown instead of the user silently landing back on a blank form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl text-cream">Sign in to Aikyam</h1>
      <p className="mt-1 text-sm text-muted">
        Discover and book authentic local experiences.
      </p>
      <LoginForm initialError={typeof error === "string" ? error : undefined} />
    </main>
  );
}
