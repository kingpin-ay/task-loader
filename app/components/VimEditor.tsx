"use client";
import { useState, useEffect, useRef } from "react";

type Mode = "normal" | "insert" | "visual" | "command" | "search" | "replace";

interface CursorPosition {
  row: number;
  col: number;
}

export default function VimEditor() {
  const [content, setContent] = useState<string[][]>([[""]]);
  const [mode, setMode] = useState<Mode>("normal");
  const [cursor, setCursor] = useState<CursorPosition>({ row: 0, col: 0 });
  const [command, setCommand] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [replaceQuery, setReplaceQuery] = useState<string>("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMode("normal");
        setCommand("");
        setSearchQuery("");
        setReplaceQuery("");
      }

      switch (mode) {
        case "normal":
          handleNormalMode(e);
          break;
        case "insert":
          handleInsertMode(e);
          break;
        case "visual":
          handleVisualMode(e);
          break;
        case "command":
          handleCommandMode(e);
          break;
        case "search":
          handleSearchMode(e);
          break;
        case "replace":
          handleReplaceMode(e);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, cursor, content, command, searchQuery, replaceQuery]);

  const handleNormalMode = (e: KeyboardEvent) => {
    switch (e.key) {
      case "i":
        setMode("insert");
        break;
      case "v":
        setMode("visual");
        break;
      case ":":
        setMode("command");
        break;
      case "/":
        setMode("search");
        break;
      case "ArrowUp":
        setCursor((prev) => ({ ...prev, row: Math.max(0, prev.row - 1) }));
        break;
      case "ArrowDown":
        setCursor((prev) => ({
          ...prev,
          row: Math.min(content.length - 1, prev.row + 1),
        }));
        break;
      case "ArrowLeft":
        setCursor((prev) => ({ ...prev, col: Math.max(0, prev.col - 1) }));
        break;
      case "ArrowRight":
        setCursor((prev) => ({
          ...prev,
          col: Math.min(content[prev.row].length, prev.col + 1),
        }));
        break;
    }
  };

  const handleInsertMode = (e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (cursor.col > 0) {
        const newContent = [...content];
        newContent[cursor.row] = [
          ...newContent[cursor.row].slice(0, cursor.col - 1),
          ...newContent[cursor.row].slice(cursor.col),
        ];
        setContent(newContent);
        setCursor((prev) => ({ ...prev, col: prev.col - 1 }));
      } else if (cursor.row > 0) {
        const newContent = [...content];
        const prevRowLength = newContent[cursor.row - 1].length;
        newContent[cursor.row - 1] = [
          ...newContent[cursor.row - 1],
          ...newContent[cursor.row],
        ];
        newContent.splice(cursor.row, 1);
        setContent(newContent);
        setCursor((prev) => ({ row: prev.row - 1, col: prevRowLength }));
      }
    } else if (e.key.length === 1) {
      const newContent = [...content];
      newContent[cursor.row] = [
        ...newContent[cursor.row].slice(0, cursor.col),
        e.key,
        ...newContent[cursor.row].slice(cursor.col),
      ];
      setContent(newContent);
      setCursor((prev) => ({ ...prev, col: prev.col + 1 }));
    }
  };

  const handleVisualMode = (e: KeyboardEvent) => {
    // Visual mode selection logic would go here
    switch (e.key) {
      case "ArrowUp":
        setCursor((prev) => ({ ...prev, row: Math.max(0, prev.row - 1) }));
        break;
      case "ArrowDown":
        setCursor((prev) => ({
          ...prev,
          row: Math.min(content.length - 1, prev.row + 1),
        }));
        break;
      case "ArrowLeft":
        setCursor((prev) => ({ ...prev, col: Math.max(0, prev.col - 1) }));
        break;
      case "ArrowRight":
        setCursor((prev) => ({
          ...prev,
          col: Math.min(content[prev.row].length, prev.col + 1),
        }));
        break;
    }
  };

  const handleCommandMode = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (command.startsWith("s/")) {
        setMode("replace");
        const [_, search, replace] = command.split("/");
        setSearchQuery(search);
        setReplaceQuery(replace);
      }
      setCommand("");
      setMode("normal");
    } else if (e.key === "Backspace") {
      setCommand((prev) => prev.slice(0, -1));
    } else if (e.key.length === 1) {
      setCommand((prev) => prev + e.key);
    }
  };

  const handleSearchMode = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      // Search logic would go here
      setSearchQuery("");
      setMode("normal");
    } else if (e.key === "Backspace") {
      setSearchQuery((prev) => prev.slice(0, -1));
    } else if (e.key.length === 1) {
      setSearchQuery((prev) => prev + e.key);
    }
  };

  const handleReplaceMode = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      // Replace logic would go here
      setSearchQuery("");
      setReplaceQuery("");
      setMode("normal");
    }
  };

  return (
    <div className="vim-editor w-full h-full" ref={editorRef}>
      <div className="mode-indicator">
        Mode: {mode.toUpperCase()}
        {mode === "command" && `:${command}`}
        {mode === "search" && `/${searchQuery}`}
        {mode === "replace" && `s/${searchQuery}/${replaceQuery}`}
      </div>
      <div className="editor-content">
        {content.map((row, rowIndex) => (
          <div key={rowIndex} className="editor-row">
            {row.map((char, colIndex) => (
              <span
                key={`${rowIndex}-${colIndex}`}
                className={`char ${
                  rowIndex === cursor.row && colIndex === cursor.col
                    ? "cursor"
                    : ""
                }`}
              >
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
