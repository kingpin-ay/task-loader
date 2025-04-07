"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type Mode = "normal" | "insert" | "visual" | "command" | "search" | "replace";

interface CursorPosition {
  row: number;
  col: number;
}

interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export default function VimEditor() {
  const [content, setContent] = useState<string[][]>([[""]]);
  const [mode, setMode] = useState<Mode>("normal");
  const [cursor, setCursor] = useState<CursorPosition>({ row: 0, col: 0 });
  const [command, setCommand] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [replaceQuery, setReplaceQuery] = useState<string>("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lineWidth, setLineWidth] = useState<number>(80); // Default line width
  const editorRef = useRef<HTMLDivElement>(null);

  // Calculate line width based on container width
  useEffect(() => {
    if (editorRef.current) {
      const updateLineWidth = () => {
        const containerWidth = editorRef.current?.clientWidth || 0;
        const charWidth = 8; // Approximate width of a monospace character
        const newLineWidth = Math.floor((containerWidth - 40) / charWidth); // 40px for line numbers and padding
        setLineWidth(Math.max(40, newLineWidth));
      };

      updateLineWidth();
      window.addEventListener("resize", updateLineWidth);
      return () => window.removeEventListener("resize", updateLineWidth);
    }
  }, []);

  const wrapLine = useCallback(
    (line: string[]): string[][] => {
      if (line.length <= lineWidth) return [line];

      const wrappedLines: string[][] = [];
      let currentLine: string[] = [];

      for (let i = 0; i < line.length; i++) {
        currentLine.push(line[i]);
        if (currentLine.length >= lineWidth) {
          wrappedLines.push([...currentLine]);
          currentLine = [];
        }
      }

      if (currentLine.length > 0) {
        wrappedLines.push(currentLine);
      }

      return wrappedLines;
    },
    [lineWidth]
  );

  const getSelectionRange = useCallback(() => {
    if (!selection) return null;
    const start = {
      row: Math.min(selection.start.row, selection.end.row),
      col: Math.min(selection.start.col, selection.end.col),
    };
    const end = {
      row: Math.max(selection.start.row, selection.end.row),
      col: Math.max(selection.start.col, selection.end.col),
    };
    return { start, end };
  }, [selection]);

  const deleteSelection = useCallback(() => {
    const range = getSelectionRange();
    if (!range) return;

    const newContent = [...content];
    if (range.start.row === range.end.row) {
      // Delete within a single line
      newContent[range.start.row] = [
        ...newContent[range.start.row].slice(0, range.start.col),
        ...newContent[range.start.row].slice(range.end.col),
      ];
    } else {
      // Delete across multiple lines
      const firstLine = newContent[range.start.row].slice(0, range.start.col);
      const lastLine = newContent[range.end.row].slice(range.end.col);
      newContent.splice(range.start.row, range.end.row - range.start.row + 1, [
        ...firstLine,
        ...lastLine,
      ]);
    }
    setContent(newContent);
    setCursor(range.start);
    setSelection(null);
  }, [content, getSelectionRange]);

  const handleNormalMode = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "i":
          setMode("insert");
          break;
        case "v":
          setMode("visual");
          setSelection({ start: cursor, end: cursor });
          break;
        case ":":
          setMode("command");
          break;
        case "/":
          setMode("search");
          break;
        case "d":
          if (selection) {
            deleteSelection();
          }
          break;
        case "g":
          if (e.key === "g") {
            setCursor({ row: 0, col: 0 });
          }
          break;
        case "G":
          setCursor({
            row: content.length - 1,
            col: content[content.length - 1].length,
          });
          break;
        case "0":
          setCursor((prev) => ({ ...prev, col: 0 }));
          break;
        case "$":
          setCursor((prev) => ({ ...prev, col: content[prev.row].length }));
          break;
        case "^":
        case "_": {
          const line = content[cursor.row];
          const firstNonWhitespace = line.findIndex((char) => char !== " ");
          setCursor((prev) => ({
            ...prev,
            col: firstNonWhitespace === -1 ? 0 : firstNonWhitespace,
          }));
          break;
        }
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
    },
    [content, cursor, selection, deleteSelection]
  );

  const handleInsertMode = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const newContent = [...content];
        const currentLine = newContent[cursor.row];
        const beforeCursor = currentLine.slice(0, cursor.col);
        const afterCursor = currentLine.slice(cursor.col);

        newContent[cursor.row] = beforeCursor;
        newContent.splice(cursor.row + 1, 0, afterCursor);

        setContent(newContent);
        setCursor((prev) => ({ row: prev.row + 1, col: 0 }));
      } else if (e.key === "Backspace") {
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
        const currentLine = newContent[cursor.row];

        // Check if adding the character would exceed line width
        if (currentLine.length >= lineWidth) {
          const wrappedLines = wrapLine([...currentLine, e.key]);
          newContent.splice(cursor.row, 1, ...wrappedLines);
          setContent(newContent);
          setCursor((prev) => ({
            row: prev.row + wrappedLines.length - 1,
            col: wrappedLines[wrappedLines.length - 1].length - 1,
          }));
        } else {
          newContent[cursor.row] = [
            ...currentLine.slice(0, cursor.col),
            e.key,
            ...currentLine.slice(cursor.col),
          ];
          setContent(newContent);
          setCursor((prev) => ({ ...prev, col: prev.col + 1 }));
        }
      }
    },
    [content, cursor, lineWidth, wrapLine]
  );

  const handleVisualMode = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          setCursor((prev) => ({ ...prev, row: Math.max(0, prev.row - 1) }));
          setSelection((prev) =>
            prev
              ? {
                  ...prev,
                  end: { ...prev.end, row: Math.max(0, prev.end.row - 1) },
                }
              : null
          );
          break;
        case "ArrowDown":
          setCursor((prev) => ({
            ...prev,
            row: Math.min(content.length - 1, prev.row + 1),
          }));
          setSelection((prev) =>
            prev
              ? {
                  ...prev,
                  end: {
                    ...prev.end,
                    row: Math.min(content.length - 1, prev.end.row + 1),
                  },
                }
              : null
          );
          break;
        case "ArrowLeft":
          setCursor((prev) => ({ ...prev, col: Math.max(0, prev.col - 1) }));
          setSelection((prev) =>
            prev
              ? {
                  ...prev,
                  end: { ...prev.end, col: Math.max(0, prev.end.col - 1) },
                }
              : null
          );
          break;
        case "ArrowRight":
          setCursor((prev) => ({
            ...prev,
            col: Math.min(content[prev.row].length, prev.col + 1),
          }));
          setSelection((prev) =>
            prev
              ? {
                  ...prev,
                  end: {
                    ...prev.end,
                    col: Math.min(
                      content[prev.end.row].length,
                      prev.end.col + 1
                    ),
                  },
                }
              : null
          );
          break;
      }
    },
    [content.length]
  );

  const handleCommandMode = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (command.startsWith("s/")) {
          setMode("replace");
          const [, search, replace] = command.split("/");
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
    },
    [command]
  );

  const handleSearchMode = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter") {
      setSearchQuery("");
      setMode("normal");
    } else if (e.key === "Backspace") {
      setSearchQuery((prev) => prev.slice(0, -1));
    } else if (e.key.length === 1) {
      setSearchQuery((prev) => prev + e.key);
    }
  }, []);

  const handleReplaceMode = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter") {
      setSearchQuery("");
      setReplaceQuery("");
      setMode("normal");
    }
  }, []);

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
  }, [
    mode,
    handleNormalMode,
    handleInsertMode,
    handleVisualMode,
    handleCommandMode,
    handleSearchMode,
    handleReplaceMode,
  ]);

  const isSelected = useCallback(
    (row: number, col: number) => {
      if (!selection) return false;
      const range = getSelectionRange();
      if (!range) return false;

      if (row < range.start.row || row > range.end.row) return false;
      if (row === range.start.row && col < range.start.col) return false;
      if (row === range.end.row && col >= range.end.col) return false;
      return true;
    },
    [selection, getSelectionRange]
  );

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
          <div key={rowIndex} className="editor-row flex">
            <div className="line-number w-8 text-right pr-2 text-gray-500">
              {rowIndex + 1}
            </div>
            <div className="line-content flex-1">
              {row.map((char, colIndex) => (
                <span
                  key={`${rowIndex}-${colIndex}`}
                  className={`char ${
                    rowIndex === cursor.row && colIndex === cursor.col
                      ? "cursor"
                      : ""
                  } ${
                    mode === "visual" && isSelected(rowIndex, colIndex)
                      ? "selected"
                      : ""
                  }`}
                >
                  {char}
                </span>
              ))}
              {rowIndex === cursor.row && row.length === cursor.col && (
                <span className="cursor">&nbsp;</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
