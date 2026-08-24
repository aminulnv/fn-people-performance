import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { goalEditGuardDescription } from "./useGoalEditGuard";

afterEach(cleanup)

const lineManager = { id: "7", name: "Api Singha", avatarUrl: "/api.png" }
const skipLevelManager = {
  id: "42",
  name: "Angie Ng Yun Ni",
  avatarUrl: "/angie.png",
}

function renderDescription(
  props: Parameters<typeof goalEditGuardDescription>[0],
) {
  render(
    <MemoryRouter>
      <p>{goalEditGuardDescription(props)}</p>
    </MemoryRouter>,
  )
}

describe("goalEditGuardDescription", () => {
  it("names both approvers with avatars after the deadline", () => {
    renderDescription({
      deadlinePassed: true,
      isSelf: false,
      lineManager,
      skipLevelManager,
    })

    expect(
      screen.getByRole("link", { name: "Api Singha" }),
    ).toHaveAttribute("href", "/people/7")
    expect(
      screen.getByRole("link", { name: "Angie Ng Yun Ni" }),
    ).toHaveAttribute("href", "/people/42")
    expect(
      screen.getByRole("link", { name: "Api Singha" }).querySelector(".pd-avatar"),
    ).not.toBeNull()
    expect(
      screen
        .getByRole("link", { name: "Angie Ng Yun Ni" })
        .querySelector(".pd-avatar"),
    ).not.toBeNull()
    expect(screen.queryByText(/direct manager/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/skip-level/i)).not.toBeInTheDocument()
  })

  it("keeps role wording only when nobody is resolved", () => {
    renderDescription({
      deadlinePassed: true,
      isSelf: true,
    })

    expect(
      screen.getByText(/the direct manager and the skip-level manager/),
    ).toBeInTheDocument()
  })
})
