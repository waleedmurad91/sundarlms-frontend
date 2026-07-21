import React from "react";
import clsx from "clsx";
import katex from "katex";
import { Mark } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo2,
  Redo2,
} from "lucide-react";
import { MathfieldElement } from "mathlive";

const getPlainText = (html = "") =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Keeps inserted LaTeX LTR inside RTL (Urdu/Sindhi) editors.
const LtrMath = Mark.create({
  name: "ltrMath",
  inclusive: false,
  excludes: "_",
  parseHTML() {
    return [
      { tag: 'span[dir="ltr"].math-ltr' },
      { tag: "span.math-ltr" },
      {
        tag: 'span[dir="ltr"]',
        getAttrs: (element) =>
          element.textContent?.includes("$") ? {} : false,
      },
    ];
  },
  renderHTML() {
    return [
      "span",
      {
        dir: "ltr",
        class: "math-ltr",
        style: "direction: ltr; unicode-bidi: isolate;",
      },
      0,
    ];
  },
});

const MathEditor = ({
  value = "",
  onChange = () => {},
  placeholder = "Start typing the topic description...",
  className = "",
  disabled = false,
  fontFamily='',
  rtl=false
}) => {
  const defaultEquation = "E = mc^2 + \\frac{1}{2}mv^2";
  const [showEquationEditor, setShowEquationEditor] = React.useState(false);
  const [equationPreview, setEquationPreview] = React.useState(defaultEquation);

  const mathRef = React.useRef(null);

  React.useEffect(() => {
    if (mathRef.current) {
      katex.render(equationPreview, mathRef.current, {
        throwOnError: false,
        displayMode: true, // true = block equation, false = inline
      });
    }
  }, [equationPreview]);

  const editor = useEditor({
    extensions: [StarterKit, LtrMath],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "math-editor__content prose prose-sm max-w-none focus:outline-none",
        dir: rtl ? "rtl" : "ltr",
        lang: rtl ? "ur" : undefined,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const mathfieldContainerRef = React.useRef(null);
  const mathfieldElementRef = React.useRef(null);
  const pendingLatexRef = React.useRef(defaultEquation);

  const insertMath = React.useCallback(
    (latex) => {
      if (!latex || !editor) {
        return;
      }

      // In RTL editors (Urdu/Sindhi), wrap LaTeX in an LTR span so formulas
      // stay left-to-right while surrounding text remains RTL.
      if (rtl) {
        editor
          .chain()
          .focus()
          .insertContent([
            { type: "text", text: " " },
            {
              type: "text",
              text: `$${latex}$`,
              marks: [{ type: "ltrMath" }],
            },
            { type: "text", text: " " },
          ])
          .run();
        return;
      }

      editor.chain().focus().insertContent(` $${latex}$ `).run();
    },
    [editor, rtl],
  );

  const focusEditor = React.useCallback(() => {
    if (!editor) {
      return;
    }
    editor.chain().focus().run();
  }, [editor]);

  const runCommand = React.useCallback(
    (command) => (event) => {
      event.preventDefault();
      if (!editor || disabled) {
        return;
      }
      command();
    },
    [editor, disabled],
  );

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    const html = value || "";
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html, false);
    }
  }, [editor, value]);

  React.useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  React.useEffect(() => {
    if (!showEquationEditor || !mathfieldContainerRef.current) {
      return undefined;
    }

    const container = mathfieldContainerRef.current;
    container.innerHTML = "";

    const mathfield = new MathfieldElement();
    mathfield.setOptions({
      virtualKeyboardMode: "onfocus",
      virtualKeyboardLayout: "math",
    });

    mathfield.setValue(pendingLatexRef.current || defaultEquation);

    const handleInput = () => {
      const latex = mathfield.getValue("latex");
      pendingLatexRef.current = latex;
      setEquationPreview(latex || defaultEquation);
    };

    mathfield.addEventListener("input", handleInput);
    container.appendChild(mathfield);
    mathfieldElementRef.current = mathfield;
    mathfield.focus();

    return () => {
      mathfield.removeEventListener("input", handleInput);
      mathfieldElementRef.current = null;
      container.innerHTML = "";
    };
  }, [showEquationEditor, defaultEquation]);

  const handleInsertMath = () => {
    const latex = (pendingLatexRef.current || "").trim();
    insertMath(latex || defaultEquation);
    if (mathfieldElementRef.current) {
      mathfieldElementRef.current.setValue("", { focus: false });
    }
    pendingLatexRef.current = defaultEquation;
    setEquationPreview(defaultEquation);
    setShowEquationEditor(false);
  };

  if (!editor) {
    return null;
  }

  const showPlaceholder = !getPlainText(editor.getHTML());
  const toolbarButtonClass =
    "rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60";

  const getButtonClass = (active = false) =>
    clsx(
      toolbarButtonClass,
      active && "border-blue-500 bg-blue-50 text-blue-600",
    );

  return (
    <div className={clsx("math-editor space-y-3", className)}>
      <div className="math-editor__toolbar flex flex-wrap gap-2">
        <button
          type="button"
          className={getButtonClass(editor.isActive("bold"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleBold().run(),
          )}
          disabled={disabled}
        >
          <BoldIcon size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("italic"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleItalic().run(),
          )}
          disabled={disabled}
        >
          <ItalicIcon size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("strike"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleStrike().run(),
          )}
          disabled={disabled}
        >
          <Strikethrough size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("heading", { level: 3 }))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
          )}
          disabled={disabled}
        >
          <Heading3 size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("bulletList"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleBulletList().run(),
          )}
          disabled={disabled}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("orderedList"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleOrderedList().run(),
          )}
          disabled={disabled}
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("blockquote"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleBlockquote().run(),
          )}
          disabled={disabled}
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("codeBlock"))}
          onMouseDown={runCommand(() =>
            editor.chain().focus().toggleCodeBlock().run(),
          )}
          disabled={disabled}
        >
          <Code size={16} />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={runCommand(() => editor.chain().focus().undo().run())}
          disabled={disabled}
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={runCommand(() => editor.chain().focus().redo().run())}
          disabled={disabled}
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div
        className={`${fontFamily} math-editor__content-wrapper relative min-h-[180px] rounded-lg border border-gray-300 bg-white p-3`}
        onClick={focusEditor}
        dir={rtl ? "rtl" : "ltr"} 
      >
        {showPlaceholder && (
          <span className={`math-editor__placeholder pointer-events-none absolute text-sm text-gray-400 ${rtl ? 'right-3 !top-4':'left-3 top-3'} ${fontFamily}`}>
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>

      <div className="math-editor__equation space-y-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Equation (LaTeX)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 relative group">
            <div
              ref={mathRef}
              className="group-hover:opacity-100 group-hover:visible transition-all duration-500 ease absolute -top-full -translate-y-1/2 bg-white w-max border border-gray-400 px-3 py-2 rounded-2xl z-10 text-xs opacity-0 invisible pointer-events-none"
            />
            <pre className="rounded bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
              {equationPreview || defaultEquation}
            </pre>
          </div>
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
            onClick={() => setShowEquationEditor((prev) => !prev)}
            disabled={disabled}
          >
            {showEquationEditor
              ? "Close Equation Editor"
              : "Open Equation Editor"}
          </button>
        </div>

        {showEquationEditor && (
          <div className="space-y-3">
            <div
              ref={mathfieldContainerRef}
              className="math-editor__mathfield rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-inner"
              aria-label="Math input"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                onClick={() => setShowEquationEditor(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                onClick={handleInsertMath}
              >
                Insert Equation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MathEditor;
