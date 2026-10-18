// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Workspace from "./Workspace";
import { V2Provider } from "./contexts/v2Context";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onCloseRequested: mocks.listen }),
}));
vi.mock("./PromptGeneratorsTab", () => ({
  default: ({ generators, onChange }: any) => (
    <button
      onClick={() => onChange([...generators, { id: "added", instances: [] }])}
    >
      add generator
    </button>
  ),
}));
vi.mock("./ConceptsTab", () => ({ default: () => null }));
vi.mock("./CategoriesTab", () => ({ default: () => null }));
vi.mock("./AttributesTab", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("registers once, saves the latest loaded generator state, and disposes on unmount", async () => {
  const data = {
    schemaVersion: 2,
    attributes: [],
    categories: [],
    concepts: [],
  };
  const prompt_generators = { schemaVersion: 2, promptGenerators: [] };
  mocks.invoke.mockImplementation(async (command) =>
    command === "load_configs" ? { data, prompt_generators } : undefined,
  );
  mocks.listen.mockResolvedValue(mocks.dispose);
  const { unmount } = render(
    <V2Provider>
      <Workspace />
    </V2Provider>,
  );
  await waitFor(() =>
    expect(mocks.invoke).toHaveBeenCalledWith("load_configs"),
  );
  await act(async () => {});
  fireEvent.click(screen.getByText("add generator"));
  expect(mocks.listen).toHaveBeenCalledTimes(1);
  await act(async () =>
    mocks.listen.mock.calls[0][0]({ preventDefault: vi.fn() }),
  );
  expect(mocks.invoke).toHaveBeenLastCalledWith("save_data", {
    payload: {
      data,
      promptGenerators: {
        ...prompt_generators,
        promptGenerators: [{ id: "added", instances: [] }],
      },
    },
  });
  unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
});
