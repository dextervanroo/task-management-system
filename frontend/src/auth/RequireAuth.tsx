import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "./useAuth";

/** Renders child routes for logged-in users and sends everyone else to /login. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <CircularProgress aria-label="Loading session" />
      </Box>
    );
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
