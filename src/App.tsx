import { V2Provider } from "./contexts/v2Context";
import UpdateChecker from "./UpdateChecker";
import Workspace from "./Workspace";
export default function App() {
  return (
    <>
      <UpdateChecker />
      <V2Provider>
        <Workspace />
      </V2Provider>
    </>
  );
}
