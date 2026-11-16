import { bob, makeTask } from "@/test/fixtures";
import { alice } from "@/test/render";

import { canDeleteTask } from "./permissions";

describe("canDeleteTask", () => {
  it("allows the creator", () => {
    expect(canDeleteTask(alice, makeTask({ createdBy: alice }))).toBe(true);
  });

  it("allows staff users", () => {
    expect(canDeleteTask({ ...alice, isStaff: true }, makeTask({ createdBy: bob }))).toBe(true);
  });

  it("denies other users and anonymous visitors", () => {
    expect(canDeleteTask(alice, makeTask({ createdBy: bob }))).toBe(false);
    expect(canDeleteTask(null, makeTask())).toBe(false);
  });
});
