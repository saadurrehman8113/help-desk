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
    <main className="grid min-h-svh grid-cols-1 min-[761px]:grid-cols-2">
      <aside className="flex flex-col overflow-hidden bg-[#e8eee4] p-6 min-[761px]:px-[9%] min-[761px]:py-[42px]">
        <Link
          to="/"
          className="inline-flex items-center gap-3 text-[19px] font-bold"
        >
          <Brand />
        </Link>
        <div className="my-auto hidden max-w-[470px] py-[70px] min-[761px]:block">
          <p className="my-[1em] text-[11px] font-bold tracking-[0.16em] text-[#5e776e]">
            A LITTLE CLARITY. A LOT OF CARE.
          </p>
          <h1 className="my-6 text-[clamp(40px,4.5vw,68px)] leading-[1.08] font-semibold tracking-[-0.055em]">
            Great support.
            <br />
            Starts with you.
          </h1>
          <p className="my-[1em] max-w-[350px] text-base leading-[1.8] text-[#60716c]">
            A calmer place to connect, solve problems, and make someone's day a
            little better.
          </p>
          <div
            className="mt-12 max-w-[360px] -rotate-3 rounded-[18px] border border-[#d7e0d1] bg-[#dde6d8] p-6"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-5 shadow-[0_8px_18px_#19332d08]">
              <span className="rounded-full bg-[#e8f1e6] px-3 py-2 text-[#3d7050]">
                &#10003;
              </span>
              <div>
                <strong className="block text-xs font-bold">
                  One less thing to worry about.
                </strong>
                <span className="mt-[7px] block text-[10px] text-[#6c7d74]">
                  More clarity. Happier customers.
                </span>
              </div>
            </div>
            <div className="mt-[18px] h-[7px] w-[70%] rounded-lg bg-[#c7d4c1]" />
            <div className="mt-2.5 h-[7px] w-[45%] rounded-lg bg-[#c7d4c1]" />
          </div>
        </div>
        <p className="my-[1em] hidden text-xs text-[#6b7d72] min-[761px]:block">
          People first. Every conversation.
        </p>
      </aside>
      <section
        className="flex flex-col items-center justify-center p-6 min-[761px]:px-10 min-[761px]:pt-16 min-[761px]:pb-7"
        aria-labelledby="login-title"
      >
        <div className="my-auto w-full max-w-[380px] py-[30px] min-[761px]:py-11">
          <p className="my-[1em] text-[11px] font-bold tracking-[0.16em] text-[#5e776e]">
            WELCOME BACK
          </p>
          <h2
            id="login-title"
            className="mt-[15px] mb-3 text-[30px] font-semibold tracking-[-0.04em]"
          >
            Sign in to your workspace
          </h2>
          <p className="mb-[35px] text-sm text-[#758178]">
            Enter your details to get started.
          </p>
          <form noValidate onSubmit={handleSubmit(login)}>
            <label
              className="mt-[22px] mb-[9px] block text-[13px] font-semibold"
              htmlFor="email"
            >
              Email address
            </label>
            <input
              className="min-h-12 w-full rounded-lg border border-[#d8dfd5] bg-white px-[14px] py-3 text-sm text-[#19332d] placeholder:text-[#96a096] aria-invalid:border-[#c43d32] aria-invalid:focus-visible:outline-[#c43d32]"
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
              <p
                id="email-error"
                className="my-[1em] rounded-lg border border-[#f1d0c8] bg-[#fff0ec] p-3 text-[13px] leading-[1.6] text-[#993d32]"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
            <label
              className="mt-[22px] mb-[9px] block text-[13px] font-semibold"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="min-h-12 w-full rounded-lg border border-[#d8dfd5] bg-white px-[14px] py-3 text-sm text-[#19332d] placeholder:text-[#96a096] aria-invalid:border-[#c43d32] aria-invalid:focus-visible:outline-[#c43d32] pr-[70px]"
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
                className="absolute top-1 right-1 cursor-pointer rounded-lg bg-transparent p-3 text-xs font-semibold text-[#60716c] hover:bg-[#eef2eb]"
                type="button"
                aria-controls="password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="my-[1em] rounded-lg border border-[#f1d0c8] bg-[#fff0ec] p-3 text-[13px] leading-[1.6] text-[#993d32]"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
            <label className="mt-5 mb-[26px] flex cursor-pointer items-center gap-2 text-xs text-[#60716c]">
              <input
                className="m-0 size-[15px] accent-[#193f33]"
                type="checkbox"
                {...register("rememberMe")}
                disabled={busy}
              />
              Keep me signed in
            </label>
            {errors.root?.server && (
              <p
                className="my-[1em] rounded-lg border border-[#f1d0c8] bg-[#fff0ec] p-3 text-[13px] leading-[1.6] text-[#993d32]"
                role="alert"
              >
                {errors.root.server.message}
              </p>
            )}
            <button
              className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-lg bg-[#193f33] px-5 py-[13px] text-sm font-semibold text-white hover:bg-[#28624f] disabled:cursor-wait disabled:opacity-65"
              type="submit"
              disabled={busy}
            >
              {busy ? "Signing in..." : "Sign in"}
              <span className="text-xl font-normal" aria-hidden="true">
                &#8594;
              </span>
            </button>
          </form>
          <p className="mt-8 mb-[1em] border-t border-[#e2e7de] pt-[26px] text-center text-xs leading-[1.9] text-[#758178]">
            Need an account or help signing in?
            <br />
            Contact your workspace administrator.
          </p>
        </div>
        <p className="my-[1em] text-xs text-[#6b7d72]">
          Your team. Your customers. One workspace.
        </p>
      </section>
    </main>
  );
}
