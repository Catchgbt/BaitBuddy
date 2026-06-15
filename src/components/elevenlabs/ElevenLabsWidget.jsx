import { useEffect } from "react";

export default function ElevenLabsWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", "agent_6801kjdd28qfe2paw3mhrfah95g7");
    document.body.appendChild(widget);

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
      if (document.body.contains(widget)) document.body.removeChild(widget);
    };
  }, []);

  return null;
}