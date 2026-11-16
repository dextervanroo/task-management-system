import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/useAuth";

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      username: username.trim() ? undefined : "Enter your username.",
      password: password ? undefined : "Enter your password.",
    };
    setErrors(nextErrors);
    if (nextErrors.username || nextErrors.password) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login(username.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? "Wrong username or password."
          : error instanceof Error
            ? error.message
            : "Could not log in.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: "100vh", display: "flex" }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, my: "auto", width: "100%" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", mb: 1 }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in to Task Manager
          </Typography>
        </Box>
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}
        <Box component="form" noValidate onSubmit={handleSubmit}>
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            fullWidth
            margin="normal"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={Boolean(errors.username)}
            helperText={errors.username}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password}
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} loading={submitting}>
            Sign in
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
          Demo accounts: alice / demo1234, bob / demo1234, admin / admin123
        </Typography>
      </Paper>
    </Container>
  );
}
