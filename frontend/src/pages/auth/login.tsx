import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "../../components/ui/field";
import { authApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { setLoggedIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await authApi.login(data);
      setLoggedIn(true);
      navigate("/");
    } catch (err) {
      console.error(err);
      form.setError("root", { message: "Invalid email or password" });
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full max-w-sm mx-auto space-y-4"
    >
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Email</FieldLabel>
              <Input {...field} placeholder="you@example.com" />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Password</FieldLabel>
              <Input {...field} type="password" placeholder="••••••••" />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      </FieldGroup>
      {form.formState.errors.root && (
        <p className="text-destructive text-sm">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Logging in..." : "Log In"}
      </Button>
    </form>
  );
}
