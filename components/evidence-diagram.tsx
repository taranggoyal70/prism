"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";

type EvidenceDiagramProps = {
  source: string;
  title: string;
};

export function EvidenceDiagram({ source, title }: EvidenceDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;

    async function drawDiagram() {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          flowchart: { curve: "basis", htmlLabels: false, padding: 24 },
          themeVariables: {
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "15px",
            primaryColor: "#dce6ff",
            primaryTextColor: "#07111f",
            primaryBorderColor: "#1648ff",
            lineColor: "#62758a",
            edgeLabelBackground: "#f8fbfd",
            clusterBkg: "#ffffff",
            clusterBorder: "#c8d3dd",
          },
        });
        const diagramId = `prism-${reactId.replaceAll(":", "")}`;
        const rendered = await mermaid.render(diagramId, source);
        if (active) {
          setSvg(rendered.svg);
          setError("");
        }
      } catch {
        if (active) {
          setError("The diagram could not be rendered. Export the Mermaid source to inspect it.");
        }
      }
    }

    void drawDiagram();
    return () => {
      active = false;
    };
  }, [reactId, source]);

  function changeZoom(delta: number) {
    setZoom((current) => Math.min(1.7, Math.max(0.55, current + delta)));
  }

  return (
    <section className="diagram-stage" aria-label={`${title} diagram`}>
      <div className="diagram-controls" aria-label="Diagram zoom controls">
        <button
          className="zoom-button"
          type="button"
          onClick={() => changeZoom(-0.15)}
          aria-label="Zoom out"
        >
          <Minus size={15} aria-hidden="true" />
        </button>
        <button
          className="zoom-button zoom-value"
          type="button"
          onClick={() => setZoom(1)}
          aria-label="Reset diagram zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className="zoom-button"
          type="button"
          onClick={() => changeZoom(0.15)}
          aria-label="Zoom in"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="diagram-canvas" aria-live="polite">
        {error ? (
          <p className="diagram-error">{error}</p>
        ) : svg ? (
          <div
            className="diagram-svg"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="diagram-loading" role="status">
            Drawing the evidence map…
          </div>
        )}
      </div>
    </section>
  );
}
