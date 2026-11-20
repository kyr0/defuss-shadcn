/**
 * Why: the cell editors of every component that edits a value in place - the Property Grid, the Property Tree, the
 * Data Grid and the Data Tree - in ONE place, emitted once in core (df$.shadcn.shared): which type a value edits as,
 * the library's own control for each type (Input, a number Input, Switch, Select, a colour / date input, Textarea), the
 * rules a value must keep, and the contract of a custom editor. Each component keeps its own cell, keys and commit;
 * what an editor IS stays the same everywhere, so an editor written for one works in the others.
 * VERIFIED: (property-grid.e2e, data-grid.e2e "editing", data-tree.e2e "editing", property-tree.e2e) every component
 * opens, validates and commits through these functions.
 */
import { defussQuery } from './query.js';

/** The types a value edits as - from its rule's `type`, else from what the value looks like. */
export type EditorType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'color'
  | 'date'
  | 'text'
  | 'json'
  | 'null'
  | 'object'
  | 'array';

/** A value's rules: how it edits and what it must keep (the Property Grid's sourceConfig entry, a column's settings). */
export interface EditorRules {
  /** how it edits */
  type?: string;
  /** the choices of an enum: values, or { value, label } */
  options?: ReadonlyArray<unknown>;
  /** a value is needed */
  required?: boolean;
  /** numbers: the smallest allowed */
  min?: number;
  /** numbers: the largest allowed */
  max?: number;
  /** numbers: whole numbers only */
  integer?: boolean;
  /** numbers: the editor's step */
  step?: number | string;
  /** text: the fewest characters */
  minLength?: number;
  /** text: the most characters */
  maxLength?: number;
  /** text: a regular expression (source) the whole value must match */
  pattern?: string;
  /** arrays: the fewest items */
  minItems?: number;
  /** arrays: the most items */
  maxItems?: number;
  /** replaces the message of whichever rule fails */
  message?: string;
}

/** An editor: the element placed in the cell and how its value is read. */
export interface CellEditor {
  /** the editor element */
  el: HTMLElement;
  /** the value it holds now */
  getValue(): unknown;
  /** a message when the value is not acceptable, '' when it is */
  validate?(): string;
  /** focus the editor (default: its first control) */
  focus?(): void;
  /** commit on every change (a switch, a select) instead of on Enter / leaving it */
  immediate?: boolean;
  /** a multi-line editor: Enter is a new line, Ctrl / Cmd + Enter commits */
  multiline?: boolean;
  /** Enter belongs to the editor (a tag input adding a tag): Ctrl / Cmd + Enter commits */
  ownsEnter?: boolean;
  /** more fields of the record to write with the value (a record's editor: a name and its colour) - the Data Grid
   *  and the Data Tree write them in the same edit */
  patch?(): Record<string, unknown>;
}

/** Options of the built-in editors. */
export interface BuiltinEditorOptions {
  /** the size of the library controls (data-size), default 'xs' */
  size?: string;
  /** the class of the colour input (each component styles its own) */
  colorClass?: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';

/**
 * The type a value edits as: its rule's type, else 'enum' when it has options, else what the value looks like
 * (a #rrggbb string is a colour, YYYY-MM-DD a date, a line break makes text).
 */
export function valueType(value: unknown, rules?: EditorRules | null): string {
  if (rules?.type) return rules.type;
  if (rules?.options) return 'enum';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^#[0-9a-f]{6}$/i.test(value)) return 'color';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (value.includes('\n')) return 'text';
  }
  return 'string';
}

/** The library's own editor for a type: a Switch, a Select, a Textarea (JSON for groups), or an Input. */
export function builtinEditor(
  type: string,
  value: unknown,
  rules?: EditorRules | null,
  options: BuiltinEditorOptions = {},
): CellEditor {
  const dfDollar = defussQuery();
  const size = options.size ?? 'xs';
  if (type === 'boolean') {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.className = 'switch';
    el.setAttribute('role', 'switch');
    el.checked = !!value;
    return { el, getValue: () => el.checked, immediate: true };
  }
  if (type === 'enum') {
    const el = document.createElement('select');
    el.className = 'select';
    el.dataset.size = size;
    const choices = rules?.options ?? [];
    for (const opt of choices) {
      const o = document.createElement('option');
      const [v, label] = isObject(opt) ? [opt.value, opt.label ?? opt.value] : [opt, opt];
      o.value = String(v);
      dfDollar(o).text(String(label));
      if (v === value) o.selected = true;
      el.append(o);
    }
    const values = choices.map((o) => (isObject(o) ? o.value : o));
    return { el, getValue: () => values.find((v) => String(v) === el.value) ?? el.value, immediate: true };
  }
  if (type === 'text' || type === 'object' || type === 'array' || type === 'json') {
    const el = document.createElement('textarea');
    el.className = 'textarea';
    el.rows = type === 'text' ? 3 : 5;
    const json = type !== 'text';
    el.value = json ? JSON.stringify(value, null, 2) : String(value ?? '');
    return {
      el,
      multiline: true,
      getValue: () => (json ? JSON.parse(el.value) : el.value),
      validate: () => {
        if (!json) return '';
        try {
          JSON.parse(el.value);
          return '';
        } catch (error) {
          return String((error as Error).message ?? error);
        }
      },
    };
  }
  const el = document.createElement('input');
  el.className = type === 'color' ? (options.colorClass ?? '') : 'input';
  if (type !== 'color') el.dataset.size = size;
  el.type = type === 'number' ? 'number' : type === 'color' ? 'color' : type === 'date' ? 'date' : 'text';
  if (type === 'number') {
    el.step = String(rules?.step ?? 'any');
    if (rules?.min != null) el.min = String(rules.min);
    if (rules?.max != null) el.max = String(rules.max);
    el.inputMode = 'decimal';
  }
  el.value = value == null ? '' : String(value);
  return {
    el,
    immediate: type === 'color' || type === 'date',
    getValue: () =>
      type === 'number'
        ? el.value === ''
          ? null
          : el.valueAsNumber
        : type === 'null' && el.value === ''
          ? null
          : el.value,
    validate: () =>
      type === 'number' && el.value !== '' && Number.isNaN(el.valueAsNumber)
        ? 'not a number'
        : el.validity && !el.validity.valid
          ? el.validationMessage
          : '',
  };
}

/**
 * A custom editor as an editor: an element (an input, a select, any control - read by its kind) or a CellEditor
 * object as it is; null / undefined / false give null.
 */
export function asEditor(custom: unknown): CellEditor | null {
  if (!custom) return null;
  if (custom instanceof HTMLElement) {
    const el = custom as HTMLInputElement;
    return {
      el,
      immediate: el.type === 'checkbox' || el.tagName === 'SELECT',
      getValue: () =>
        el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? el.valueAsNumber : el.value,
    };
  }
  if (isObject(custom) && custom.el instanceof HTMLElement && typeof custom.getValue === 'function')
    return custom as unknown as CellEditor;
  return null;
}

/** The control inside an editor that takes focus and carries aria-invalid (the element itself when it is one). */
export function editorControl(editor: CellEditor): HTMLElement {
  const sel = 'input, select, textarea, button, [tabindex]';
  return editor.el.matches?.(sel) ? editor.el : (defussQuery()(editor.el).find(sel).get(0) ?? editor.el);
}

/** Focus an editor (its own focus(), else its control) and select a text field's content. */
export function focusEditor(editor: CellEditor): void {
  const target = editorControl(editor) as HTMLInputElement;
  (editor.focus ?? (() => target.focus?.()))();
  if (target.select && !['checkbox', 'color', 'date', 'range'].includes(target.type)) target.select();
}

/**
 * The first rule a value breaks, as a message ('' = it keeps them all): required, min / max / integer (numbers),
 * minLength / maxLength / pattern (text), minItems / maxItems (arrays); rules.message replaces the rule's own.
 */
export function editorProblem(rules: EditorRules | null | undefined, value: unknown): string {
  if (!rules) return '';
  const say = (fallback: string) => rules.message || fallback;
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
  if (rules.required && empty) return say('Required');
  if (empty) return '';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return say('Not a number');
    if (rules.integer && !Number.isInteger(value)) return say('Must be a whole number');
    if (rules.min != null && value < rules.min) return say(`Must be at least ${rules.min}`);
    if (rules.max != null && value > rules.max) return say(`Must be at most ${rules.max}`);
  }
  if (typeof value === 'string') {
    if (rules.minLength != null && value.length < rules.minLength) return say(`At least ${rules.minLength} characters`);
    if (rules.maxLength != null && value.length > rules.maxLength) return say(`At most ${rules.maxLength} characters`);
    if (rules.pattern && !new RegExp(`^(?:${rules.pattern})$`).test(value))
      return say('Does not match the expected format');
  }
  if (Array.isArray(value)) {
    if (rules.minItems != null && value.length < rules.minItems) return say(`At least ${rules.minItems}`);
    if (rules.maxItems != null && value.length > rules.maxItems) return say(`At most ${rules.maxItems}`);
  }
  return '';
}

/**
 * What a key does inside an open editor: 'cancel' (Escape), 'commit' (Enter - Ctrl / Cmd + Enter for a multi-line
 * editor or one that owns Enter), 'next' / 'prev' (Tab / Shift + Tab), else null (the editor's own key).
 */
export function editorKey(e: KeyboardEvent, editor: CellEditor): 'cancel' | 'commit' | 'next' | 'prev' | null {
  if (e.key === 'Escape') return 'cancel';
  if (e.key === 'Enter' && (!(editor.multiline || editor.ownsEnter) || e.metaKey || e.ctrlKey)) return 'commit';
  if (e.key === 'Tab') return e.shiftKey ? 'prev' : 'next';
  return null;
}
