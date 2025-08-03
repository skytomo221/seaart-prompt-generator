import Box from '@mui/material/Box';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import KeywordSelect from "./KeywordSelect";
import IconButton from "@mui/material/IconButton";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SelectedKeywordName } from "./selectedKeywordName";

export default function SortableKeyword({
  selectedKeywordName,
}: {
  selectedKeywordName: SelectedKeywordName;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: `${selectedKeywordName.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} sx={{ display: "flex", alignItems: "center", ml: -1.5, mb: 1, cursor: "grab" }}>
      <IconButton {...listeners} disableRipple sx={{ cursor: "grab" }}>
        <DragHandleIcon />
      </IconButton>
      <KeywordSelect selectedKeywordName={selectedKeywordName} />
    </Box>
  );
}
