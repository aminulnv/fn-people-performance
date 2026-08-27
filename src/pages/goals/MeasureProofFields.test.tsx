import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeasureProofFields, MeasureProofReadout } from "./MeasureProofFields";

afterEach(cleanup)

describe("MeasureProofFields", () => {
  it("stays hidden until Add proof is clicked", () => {
    render(<MeasureProofFields name="NPS" onChange={vi.fn()} />)

    expect(screen.queryByLabelText("Proof link for NPS")).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Add proof for NPS" }))
    expect(screen.queryByLabelText("Proof link for NPS")).not.toBeInTheDocument()
    const addButton = screen.getByRole("button", { name: "Add proof for NPS" })
    expect(addButton).not.toHaveClass("is-linked")
    fireEvent.click(addButton)
    expect(screen.getByLabelText("Proof link for NPS")).toBeInTheDocument()
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Proof note for NPS")).not.toBeInTheDocument()
  })

  it("keeps an icon-only proof button in the header and the fields in the popover", () => {
    render(
      <MeasureProofFields
        name="NPS"
        open
        proofUrl="https://dash.fn/nps"
        onChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole("button", { name: "Edit proof for NPS" })
    expect(trigger).not.toHaveTextContent("URL")
    expect(trigger).toHaveClass("is-linked")
    expect(screen.getByText("Saved")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /dash.fn\/nps/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Proof link for NPS")).toHaveValue(
      "https://dash.fn/nps",
    )
    expect(screen.queryByLabelText("Proof note for NPS")).not.toBeInTheDocument()
  })

  it("does not persist the URL while it is being typed", () => {
    const onChange = vi.fn()
    function Harness() {
      const [proofUrl, setProofUrl] = useState("https://dash.fn/nps")
      return (
        <MeasureProofFields
          name="NPS"
          open
          proofUrl={proofUrl}
          onChange={(next) => {
            onChange(next)
            setProofUrl(next.proofUrl)
          }}
        />
      )
    }
    render(<Harness />)

    expect(screen.getByText("Saved")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Proof link for NPS"), {
      target: { value: "https://dash.fn/nps-q3" },
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Proof link for NPS")).toHaveValue(
      "https://dash.fn/nps-q3",
    )

    fireEvent.blur(screen.getByLabelText("Proof link for NPS"))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      proofUrl: "https://dash.fn/nps-q3",
    })
    expect(screen.getByText("Saved")).toBeInTheDocument()
  })

  it("saves a normalized link", () => {
    const onChange = vi.fn()
    function Harness() {
      const [proofUrl, setProofUrl] = useState<string | undefined>()
      return (
        <MeasureProofFields
          name="NPS"
          open
          proofUrl={proofUrl}
          onChange={(next) => {
            onChange(next)
            setProofUrl(next.proofUrl)
          }}
        />
      )
    }
    render(<Harness />)

    fireEvent.change(screen.getByLabelText("Proof link for NPS"), {
      target: { value: "dash.fn/nps" },
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
    fireEvent.blur(screen.getByLabelText("Proof link for NPS"))
    expect(onChange).toHaveBeenLastCalledWith({
      proofUrl: "https://dash.fn/nps",
    })
    expect(screen.getByLabelText("Proof link for NPS")).toHaveValue(
      "https://dash.fn/nps",
    )
    expect(screen.getByText("Saved")).toBeInTheDocument()
  })

  it("does not persist an incomplete URL or mark it saved", () => {
    const onChange = vi.fn()
    function Harness() {
      const [proofUrl, setProofUrl] = useState("https://dash.fn/nps")
      return (
        <MeasureProofFields
          name="NPS"
          open
          proofUrl={proofUrl}
          onChange={(next) => {
            onChange(next)
            setProofUrl(next.proofUrl)
          }}
        />
      )
    }
    render(<Harness />)

    fireEvent.change(screen.getByLabelText("Proof link for NPS"), {
      target: { value: "https://,\\" },
    })
    fireEvent.blur(screen.getByLabelText("Proof link for NPS"))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Proof link for NPS")).toHaveValue(
      "https://dash.fn/nps",
    )
    expect(screen.getByText("Saved")).toBeInTheDocument()
  })

  it("does not save an incomplete URL when nothing was stored yet", () => {
    const onChange = vi.fn()
    render(
      <MeasureProofFields name="NPS" open onChange={onChange} />,
    )

    fireEvent.change(screen.getByLabelText("Proof link for NPS"), {
      target: { value: "https://,\\" },
    })
    fireEvent.blur(screen.getByLabelText("Proof link for NPS"))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add proof for NPS" }),
    ).not.toHaveClass("is-linked")
  })

  it("does not offer Add proof when the field is locked", () => {
    render(<MeasureProofFields name="NPS" disabled onChange={vi.fn()} />)
    expect(
      screen.queryByRole("button", { name: "Add proof for NPS" }),
    ).not.toBeInTheDocument()
  })
})

describe("MeasureProofReadout", () => {
  it("shows the host for a saved link", () => {
    render(
      <MeasureProofReadout proofUrl="https://www.example.com/report" />,
    )

    const link = screen.getByRole("link", { name: /example.com\/report/ })
    expect(link).toHaveAttribute("href", "https://www.example.com/report")
  })

  it("renders nothing when both fields are empty", () => {
    const { container } = render(<MeasureProofReadout />)
    expect(container).toBeEmptyDOMElement()
  })
})
