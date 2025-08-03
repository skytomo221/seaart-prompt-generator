import Box from '@mui/material/Box';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import KeywordSelect from "./KeywordSelect";
import IconButton from "@mui/material/IconButton";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableKeyword({
  index,
  keywordIndex,
}: {
  index: number;
  keywordIndex: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: `${index}-${keywordIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} sx={{ display: "flex", alignItems: "center", ml: -1.5, mb: 1, cursor: "grab" }}>
      <IconButton {...listeners} disableRipple sx={{ cursor: "grab" }}>
        <DragHandleIcon />
      </IconButton>
      <KeywordSelect index={index} keywordIndex={keywordIndex} />
    </Box>
  );
}
