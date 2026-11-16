import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/render";

import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  function renderDialog(busy = false) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        title="Delete task?"
        message="This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  }

  it("confirms and cancels", async () => {
    const { onConfirm, onCancel } = renderDialog();
    expect(screen.getByRole("dialog", { name: "Delete task?" })).toHaveTextContent(
      "This cannot be undone.",
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables cancel while busy", () => {
    renderDialog(true);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
