// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UpdateChecker from "./UpdateChecker";

const { checkForUpdates, installUpdate, showToast } = vi.hoisted(() => ({
  checkForUpdates: vi.fn(),
  installUpdate: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("./updater", () => ({ checkForUpdates, installUpdate }));
vi.mock("./toaster", () => ({
  appToaster: Promise.resolve({ show: showToast }),
}));

function availableUpdate(version = "2.2.0") {
  return {
    version,
    downloadAndInstall: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkForUpdates.mockResolvedValue(null);
  installUpdate.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe("UpdateChecker", () => {
  it("checks only once in StrictMode and shows nothing when there is no update", async () => {
    render(
      <StrictMode>
        <UpdateChecker />
      </StrictMode>,
    );

    await waitFor(() => expect(checkForUpdates).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the available version in a Blueprint dialog", async () => {
    checkForUpdates.mockResolvedValue(availableUpdate());
    render(<UpdateChecker />);

    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.getByText("アップデートがあります")).not.toBeNull();
    expect(
      screen.getByText("バージョン 2.2.0 が利用できます。"),
    ).not.toBeNull();
  });

  it("closes and releases the update when the user chooses later", async () => {
    const update = availableUpdate();
    checkForUpdates.mockResolvedValue(update);
    render(<UpdateChecker />);

    fireEvent.click(await screen.findByRole("button", { name: "後で" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(update.close).toHaveBeenCalledOnce();
    expect(installUpdate).not.toHaveBeenCalled();
  });

  it("starts the install once and disables both actions while it is running", async () => {
    const update = availableUpdate();
    let finishInstall!: () => void;
    installUpdate.mockImplementation(
      () => new Promise<void>((resolve) => (finishInstall = resolve)),
    );
    checkForUpdates.mockResolvedValue(update);
    render(<UpdateChecker />);

    const button = await screen.findByRole("button", { name: "アップデート" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(installUpdate).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "後で" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    finishInstall();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps startup usable and shows no dialog if the update check fails", async () => {
    checkForUpdates.mockRejectedValue(new Error("offline"));
    render(<UpdateChecker />);

    await waitFor(() => expect(checkForUpdates).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows a user-facing toast if installation fails and permits retry", async () => {
    checkForUpdates.mockResolvedValue(availableUpdate());
    installUpdate.mockRejectedValueOnce(new Error("install failed"));
    render(<UpdateChecker />);

    fireEvent.click(
      await screen.findByRole("button", { name: "アップデート" }),
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: "アップデートに失敗しました。",
        intent: "danger",
      }),
    );
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "アップデート",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
