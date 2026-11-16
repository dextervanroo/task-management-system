import LogoutIcon from "@mui/icons-material/Logout";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { Outlet } from "react-router";

import { useAuth } from "@/auth/useAuth";

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <TaskAltIcon />
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Task Manager
          </Typography>
          <Typography
            variant="body2"
            sx={{ display: { xs: "none", sm: "block" } }}
            data-testid="current-user"
          >
            {user?.fullName}
          </Typography>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => void logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
