import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { signIn } from "../lib/auth-client";
import { Brand } from "../components/Brand";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

function signInError(status: number) {
  if ([400, 401].includes(status))
    return "The email or password is incorrect. Please try again.";

  if (status === 429)
    return "Too many attempts. Please wait before trying again.";
  return "Unable to sign in. Please try again in a moment.";
}

export function LoginPage() {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting: busy },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const [showPassword, setShowPassword] = useState(false);

  async function login(values: LoginValues) {
    clearErrors("root");
    try {
      const result = await signIn.email(values);
      if (result.error) throw new Error(signInError(result.error.status));
    } catch (failure) {
      setError("root.server", {
        message:
          failure instanceof Error
            ? failure.message
            : "Unable to sign in. Please try again.",
      });
    }
  }

  return (
    <main className="login-layout">
      <aside className="login-story">
        <Link to="/" className="brand">
          <Brand />
        </Link>
        <div className="story-content">
          <p className="eyebrow">A LITTLE CLARITY. A LOT OF CARE.</p>
          <h1>
            Great support.
            <br />
            Starts with you.
          </h1>
          <p>
            A calmer place to connect, solve problems, and make someone's day a
            little better.
          </p>
          <div className="story-art" aria-hidden="true">
            <div className="art-card">
              <span className="art-check">&#10003;</span>
              <div>
                <strong>One less thing to worry about.</strong>
                <span>More clarity. Happier customers.</span>
              </div>
            </div>
            <div className="art-line" />
            <div className="art-line short" />
          </div>
        </div>
        <p className="story-footer">People first. Every conversation.</p>
      </aside>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <p className="eyebrow">WELCOME BACK</p>
          <h2 id="login-title">Sign in to your workspace</h2>
          <p className="form-intro">Enter your details to get started.</p>
          <form noValidate onSubmit={handleSubmit(login)}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
              disabled={busy}
            />
            {errors.email && (
              <p id="email-error" className="error" role="alert">
                {errors.email.message}
              </p>
            )}
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                {...register("password")}
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={busy}
              />
              <button
                className="password-toggle"
                type="button"
                aria-controls="password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="error" role="alert">
                {errors.password.message}
              </p>
            )}
            <label className="remember">
              <input
                type="checkbox"
                {...register("rememberMe")}
                disabled={busy}
              />
              Keep me signed in
            </label>
            {errors.root?.server && (
              <p className="error" role="alert">
                {errors.root.server.message}
              </p>
            )}
            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
              <span aria-hidden="true">&#8594;</span>
            </button>
          </form>
          <p className="access-note">
            Need an account or help signing in?
            <br />
            Contact your workspace administrator.
          </p>
        </div>
        <p className="panel-footer">
          Your team. Your customers. One workspace.
        </p>
      </section>
    </main>
  );
}
