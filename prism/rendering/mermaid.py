from __future__ import annotations

from prism.models import DiagramNode, DiagramSpec


def _label(node: DiagramNode) -> str:
    evidence = ", ".join(node.evidence_ids)
    return f"{node.label} · {evidence}".replace('"', "'")


def render_mermaid(spec: DiagramSpec) -> str:
    if spec.diagram_type == "sequence":
        return _render_sequence(spec)
    if spec.diagram_type == "state_machine":
        return _render_state_machine(spec)
    return _render_flowchart(spec)


def _render_flowchart(spec: DiagramSpec) -> str:
    lines = ["flowchart TD"]
    for node in spec.nodes:
        label = _label(node)
        shape = f'{{"{label}"}}' if node.kind == "decision" else f'["{label}"]'
        lines.append(f"    {node.id}{shape}")
    for edge in spec.edges:
        edge_label = f"|{edge.label}|" if edge.label else ""
        lines.append(f"    {edge.source} -->{edge_label} {edge.target}")
    lines.extend(
        [
            "    classDef evidence fill:#E8EDFF,stroke:#234BE3,color:#17211B,stroke-width:2px",
            f"    class {','.join(node.id for node in spec.nodes)} evidence",
        ]
    )
    return "\n".join(lines)


def _render_sequence(spec: DiagramSpec) -> str:
    lines = ["sequenceDiagram"]
    for participant in spec.participants:
        lines.append(f"    participant {participant}")
    for edge in spec.edges:
        lines.append(f"    {edge.source}->>{edge.target}: {edge.label}")
    return "\n".join(lines)


def _render_state_machine(spec: DiagramSpec) -> str:
    lines = ["stateDiagram-v2"]
    for edge in spec.edges:
        label = f" : {edge.label}" if edge.label else ""
        lines.append(f"    {edge.source} --> {edge.target}{label}")
    return "\n".join(lines)
