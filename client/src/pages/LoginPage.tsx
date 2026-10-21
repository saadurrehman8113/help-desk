import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
    control,
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
      <aside className="flex flex-col overflow-hidden bg-muted p-6 min-[761px]:px-[9%] min-[761px]:py-[42px]">
        <Link
          to="/"
          className="inline-flex items-center gap-3 text-[19px] font-bold"
        >
          <Brand />
        </Link>
        <div className="my-auto hidden max-w-[470px] py-[70px] min-[761px]:block">
          <p className="my-[1em] text-[11px] font-bold tracking-[0.16em] text-muted-foreground">
            A LITTLE CLARITY. A LOT OF CARE.
          </p>
          <h1 className="my-6 text-[clamp(40px,4.5vw,68px)] leading-[1.08] font-semibold tracking-[-0.055em]">
            Great support.
            <br />
            Starts with you.
          </h1>
          <p className="my-[1em] max-w-[350px] text-base leading-[1.8] text-muted-foreground">
            A calmer place to connect, solve problems, and make someone's day a
            little better.
          </p>
          <div
            className="mt-12 max-w-[360px] -rotate-3 rounded-[18px] border border-border bg-muted p-6"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3 rounded-[10px] bg-card px-4 py-5 shadow-sm">
              <span className="rounded-full bg-secondary px-3 py-2 text-secondary-foreground">
                &#10003;
              </span>
              <div>
                <strong className="block text-xs font-bold">
                  One less thing to worry about.
                </strong>
                <span className="mt-[7px] block text-[10px] text-muted-foreground">
                  More clarity. Happier customers.
                </span>
              </div>
            </div>
            <div className="mt-[18px] h-[7px] w-[70%] rounded-lg bg-border" />
            <div className="mt-2.5 h-[7px] w-[45%] rounded-lg bg-border" />
          </div>
        </div>
        <p className="my-[1em] hidden text-xs text-muted-foreground min-[761px]:block">
          People first. Every conversation.
        </p>
      </aside>
      <section
        className="flex flex-col items-center justify-center p-6 min-[761px]:px-10 min-[761px]:pt-16 min-[761px]:pb-7"
        aria-labelledby="login-title"
      >
        <div className="my-auto w-full max-w-[380px] py-[30px] min-[761px]:py-11">
          <p className="my-[1em] text-[11px] font-bold tracking-[0.16em] text-muted-foreground">
            WELCOME BACK
          </p>
          <h2
            id="login-title"
            className="mt-[15px] mb-3 text-[30px] font-semibold tracking-[-0.04em]"
          >
            Sign in to your workspace
          </h2>
          <p className="mb-[35px] text-sm text-muted-foreground">
            Enter your details to get started.
          </p>
          <form noValidate onSubmit={handleSubmit(login)}>
            <Label className="mt-6 mb-2" htmlFor="email">
              Email address
            </Label>
            <Input
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
              <Alert id="email-error" variant="destructive" className="my-3">
                <AlertDescription>{errors.email.message}</AlertDescription>
              </Alert>
            )}
            <Label className="mt-6 mb-2" htmlFor="password">
              Password
            </Label>
            <div className="relative">
              <Input
                className="pr-16"
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
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0"
                type="button"
                aria-controls="password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
            {errors.password && (
              <Alert id="password-error" variant="destructive" className="my-3">
                <AlertDescription>{errors.password.message}</AlertDescription>
              </Alert>
            )}
            <div className="my-6 flex items-center gap-2">
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="remember-me"
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    disabled={busy}
                  />
                )}
              />
              <Label htmlFor="remember-me">Keep me signed in</Label>
            </div>
            {errors.root?.server && (
              <Alert variant="destructive" className="my-3">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
            )}
            <Button
              className="w-full justify-between"
              type="submit"
              disabled={busy}
            >
              {busy ? "Signing in..." : "Sign in"}
              <span className="text-xl font-normal" aria-hidden="true">
                &#8594;
              </span>
            </Button>
          </form>
          <p className="mt-8 mb-[1em] border-t border-border pt-[26px] text-center text-xs leading-[1.9] text-muted-foreground">
            Need an account or help signing in?
            <br />
            Contact your workspace administrator.
          </p>
        </div>
        <p className="my-[1em] text-xs text-muted-foreground">
          Your team. Your customers. One workspace.
        </p>
      </section>
    </main>
  );
}
