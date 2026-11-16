import { Box, Button, Typography } from "@mui/material";
import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <Box component="main" sx={{ textAlign: "center", py: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Go to tasks
      </Button>
    </Box>
  );
}
