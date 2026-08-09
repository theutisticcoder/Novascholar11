import { useEffect, useRef } from "react";

interface LatexRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: any[]) => Promise<any>;
    };
  }
}

export default function LatexRenderer({ text, className = "", inline = false }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([containerRef.current]).catch((err) => {
        console.error("MathJax typesetting error:", err);
      });
    }
  }, [text]);

  const Tag = inline ? "span" : "div";
  const isHtml = /<[a-z][\s\S]*>/i.test(text);

  if (isHtml) {
    return (
      <Tag
        ref={containerRef as any}
        className={`tex2jax_process leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  return (
    <Tag
      ref={containerRef as any}
      className={`tex2jax_process leading-relaxed ${className}`}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {text}
    </Tag>
  );
}
