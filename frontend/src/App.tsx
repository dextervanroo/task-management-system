import { Container, Typography } from "@mui/material";

export default function App() {
  return (
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1">
        Task Manager
      </Typography>
    </Container>
  );
}
