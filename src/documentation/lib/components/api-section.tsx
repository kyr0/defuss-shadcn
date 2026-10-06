import type { Props } from 'defuss';
import { readFileSync } from 'node:fs';
import { readComponentSource, repoFile } from '../repo';
import { readComponentApi, signatureOf, type ApiField, type ApiMember } from '../component-api';

const H2_STYLE =
  'font-family:var(--font-display);font-size:1.5rem;font-weight:400;letter-spacing:-0.025em;margin:0 0 0.375rem;';
const H3_STYLE = 'font-size:1rem;font-weight:600;margin:1.75rem 0 0.5rem;';

type Cell = string | { code: string } | object;

/** a reference table (shipped .table component); a cell is text, code or markup (a nested table) */
function Rows({ head, rows }: { head: string[]; rows: Cell[][] }) {
  return (
    <div class="table-container" style="margin-top:0.5rem;">
      <table class="table">
        <thead>
          <tr class="table-row">
            {head.map((h) => (
              <th class="table-head" scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr class="table-row">
              {row.map((cell, i) => (
                <td class="table-cell" style={i === 0 && row.length > 1 ? 'vertical-align:top;width:34%;' : 'vertical-align:top;'}>
                  {typeof cell === 'string'
                    ? cell
                    : cell && typeof cell === 'object' && 'code' in cell
                      // a short name stays on one line; a typed signature wraps (it would push the description out of the card)
                      ? <code style={cell.code.length > 32 ? 'white-space:normal;overflow-wrap:anywhere;' : 'white-space:nowrap;'}>{cell.code}</code>
                      : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** a nested table inside a Description cell: the arguments, a detail's or a type's fields */
function Inner({ head, rows }: { head: string[]; rows: Array<[string, string, string]> }) {
  return (
    <table class="table api-inner" style="margin-top:0.5rem;font-size:0.75rem;">
      <thead>
        <tr class="table-row">{head.map((h) => <th class="table-head" scope="col">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(([name, type, doc]) => (
          <tr class="table-row">
            <td class="table-cell" style="vertical-align:top;"><code>{name}</code></td>
            <td class="table-cell" style="vertical-align:top;"><code>{type}</code></td>
            <td class="table-cell" style="vertical-align:top;">{doc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** a member's Description: the prose, its arguments, what it returns */
function MemberDoc({ m }: { m: ApiMember }) {
  return (
    <div>
      {m.doc}
      {m.kind === 'method' && m.args.length ? (
        <Inner head={['Argument', 'Type', 'Description']} rows={m.args.map((a) => [`${a.name}${a.optional && !a.default ? '?' : ''}`, `${a.type}${a.default ? ` = ${a.default}` : ''}`, a.doc])} />
      ) : null}
      {m.kind === 'method' && m.returns.type && !/^(void|undefined)$/.test(m.returns.type) ? (
        <p class="m-0" style="margin-top:0.5rem;"><b>Returns</b> <code>{m.returns.type}</code>{m.returns.doc ? ` - ${m.returns.doc}` : ''}</p>
      ) : null}
    </div>
  );
}

const fieldRows = (fields: ApiField[]): Array<[string, string, string]> => fields.map((x) => [`${x.name}${x.optional ? '?' : ''}`, x.type, x.doc]);
const memberRow = (m: ApiMember, prefix = ''): Cell[] => [{ code: prefix + signatureOf(m) }, <MemberDoc m={m} />];

/**
 * The #api section of a JS component page - its whole public surface, read
 * from the component's .ts at docs build time (src/documentation/lib/
 * component-api.ts, the same reader verify and the skills' ## API use): the
 * State API every element has, the registry, the component's df$.shadcn
 * namespace, an instance interface, the events. Descriptions are the
 * source's JSDoc, so the page can never document a method that is not there.
 * Authored children (prose) render below the generated tables.
 * VERIFIED: (verify's API docs gate) every JS component page carries it and
 * its source has no gap, so every member, argument, event field and type
 * shown here is typed and described.
 */
export function ApiSection({ component, children }: Props & { component: string }) {
  const src = readComponentSource(component, 'js');
  if (!src) return null;
  // the shared State API's JSDoc (el.api, the registry) documents those members on every page
  const api = readComponentApi(component, src, readFileSync(repoFile('src', 'shared', 'component-state.ts'), 'utf8'));
  const S = `${api.pascal}State`;
  const stateValue = `{ name: ${S}; config: ${api.pascal}StateConfigs[${S}] }`;
  const el: Cell[][] = [
    ...(api.instance
      ? [[{ code: 'el.api' }, `The instance (${api.instance.name}, below) - its setState / getState / render run through el.store.`] as Cell[]]
      : api.stateApi.element.map((m) => memberRow(m, 'el.api.'))),
    [{ code: `el.store: Store<${stateValue}>` }, "A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component."],
  ];
  const registry: Cell[][] = [
    ...[...api.stateApi.registry, ...api.registryExtras].map((m) => memberRow(m, `df$.shadcn.${api.camel}Api.`)),
    [{ code: `df$.shadcn.${api.camel}States: ${S}[]` }, `The declared states, 'default' first: ${api.states.join(', ')}.`],
  ];
  return (
    <section style="margin-top:3rem;" id="api">
      <h2 style={H2_STYLE}>API</h2>
      <p class="text-sm text-muted-foreground mb-3">
        Generated from <code>{`${component}.ts`}</code> and the shared State API - the descriptions are their JSDoc, the types are checked by the compiler.
      </p>
      <h3 style={H3_STYLE}>States</h3>
      <p class="text-sm text-muted-foreground mb-2">
        <code>{`type ${S} = ${api.states.map((n) => `'${n}'`).join(' | ')}`}</code> - <code>setState(name, config)</code> takes the config of the state it names.
      </p>
      <Rows head={['State', 'Description']} rows={(api.stateConfigs ?? []).map((c) => [{ code: c.name }, (
        <div>
          {c.doc}
          {c.fields.length ? <Inner head={['Config field', 'Type', 'Description']} rows={fieldRows(c.fields)} /> : <p class="m-0" style="margin-top:0.5rem;">No config.</p>}
        </div>
      )])} />
      <h3 style={H3_STYLE}>Every element</h3>
      <Rows head={['Member', 'Description']} rows={el} />
      <h3 style={H3_STYLE}>Registry</h3>
      <Rows head={['Member', 'Description']} rows={registry} />
      {api.namespaces.map((ns) => (
        <div>
          <h3 style={H3_STYLE}>
            <code>{`df$.shadcn.${ns.name}`}</code>
          </h3>
          {ns.callable ? <Rows head={['Member', 'Description']} rows={[memberRow(ns.callable, 'df$.shadcn.')]} /> : null}
          {ns.members.length ? <Rows head={['Member', 'Description']} rows={ns.members.map((m) => memberRow(m))} /> : null}
        </div>
      ))}
      {api.instance ? (
        <div>
          <h3 style={H3_STYLE}>
            The instance (<code>{api.instance.name}</code>)
          </h3>
          <Rows head={['Member', 'Description']} rows={api.instance.members.map((m) => memberRow(m))} />
        </div>
      ) : null}
      {api.events.length ? (
        <div>
          <h3 style={H3_STYLE}>Events</h3>
          <Rows head={['Event', 'Description']} rows={api.events.map((e) => [{ code: e.name }, (
            <div>
              {e.doc}
              {!e.detail.length ? <p class="m-0" style="margin-top:0.5rem;">No <code>detail</code>.</p> : <p class="m-0" style="margin-top:0.5rem;"><code>detail</code>: <code>{e.type || e.detail.join(', ')}</code></p>}
              {e.fields.length ? <Inner head={['Field', 'Type', 'Description']} rows={fieldRows(e.fields)} /> : null}
            </div>
          )])} />
        </div>
      ) : null}
      {api.types.length ? (
        <div>
          <h3 style={H3_STYLE}>Types</h3>
          <Rows head={['Type', 'Description']} rows={api.types.map((t) => [{ code: t.name }, (
            <div>
              {t.doc}
              {t.fields.length ? <Inner head={['Field', 'Type', 'Description']} rows={fieldRows(t.fields)} /> : t.alias ? <p class="m-0" style="margin-top:0.5rem;">= <code>{t.alias}</code></p> : null}
            </div>
          )])} />
        </div>
      ) : null}
      {children}
    </section>
  );
}
