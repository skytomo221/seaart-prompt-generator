import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useRef, useState } from "react";

export default function InsertButton({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>();

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: "relative",
        height: 12,
        my: -0.8,
      }}
    >
      <Box
        sx={{
          height: "3px",
          opacity: visible ? 1 : 0,
          backgroundColor: "success.main",
        }}
      />

      {visible && (
        <Button
          onClick={onClick}
          color="success"
          variant="contained"
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid",
            transition: "opacity 0.2s ease",
            opacity: visible ? 1 : 0,
          }}
        >
          <AddIcon />
        </Button>
      )}
    </Box>
  );
}
