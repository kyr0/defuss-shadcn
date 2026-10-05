import type { Props } from 'defuss';
import { readComponentSource } from '../repo';
import { readComponentApi, type ApiMember } from '../component-api';

const H2_STYLE =
  'font-family:var(--font-display);font-size:1.5rem;font-weight:400;letter-spacing:-0.025em;margin:0 0 0.375rem;';
const H3_STYLE = 'font-size:1rem;font-weight:600;margin:1.75rem 0 0.5rem;';

/** a two-column reference table (shipped .table component) */
function Rows({ head, rows }: { head: string[]; rows: Array<Array<string | { code: string }>> }) {
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
              {row.map((cell) => (
                <td class="table-cell" style="vertical-align:top;">
                  {typeof cell === 'string' ? cell : <code style="white-space:nowrap;">{cell.code}</code>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sig = (m: ApiMember) => `${m.name}${m.kind === 'method' ? m.params || '()' : ''}`;

/**
 * The #api section of a JS component page - its whole public surface, read
 * from the component's .ts at docs build time (src/documentation/lib/
 * component-api.ts, the same reader verify and the skills' ## API use): the
 * State API every element has, the registry, the component's df$.shadcn
 * namespace, an instance interface, the events. Descriptions are the
 * source's JSDoc, so the page can never document a method that is not there.
 * Authored children (prose) render below the generated tables.
 */
export function ApiSection({ component, children }: Props & { component: string }) {
  const src = readComponentSource(component, 'js');
  if (!src) return null;
  const api = readComponentApi(component, src);
  const el: Array<Array<string | { code: string }>> = api.instance
    ? [
      [{ code: 'el.api' }, `The instance (${api.instance.name}, below) - its setState / getState / render run through el.store.`],
      [{ code: 'el.store' }, 'A defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component.'],
    ]
    : [
      [{ code: 'el.api.setState(name, config?)' }, `Enter a declared state (${api.states.join(', ')}); unknown names throw.`],
      [{ code: 'el.api.getState()' }, 'The state the element shows now - { name, config, model }.'],
      [{ code: 'el.api.render(state?)' }, "The component's markup in a state - the authored markup with that state applied."],
      [{ code: 'el.api.settled()' }, "Resolves when the last state's DOM work is done (async states)."],
      [{ code: 'el.store' }, 'A defuss-store store of { name, config } - subscribe to follow every change (also the user\'s), set it to drive the component.'],
    ];
  const registry: Array<Array<string | { code: string }>> = [
    [{ code: `df$.shadcn.${api.camel}Api` }, 'setState(el, name, config?), getState(el), render(state), store(el), commit(el, name, config?) - the element passed explicitly.'],
    ...api.registryExtras.map((m): Array<string | { code: string }> => [{ code: `df$.shadcn.${api.camel}Api.${sig(m)}` }, m.doc]),
    [{ code: `df$.shadcn.${api.camel}States` }, api.states.join(', ')],
  ];
  return (
    <section style="margin-top:3rem;" id="api">
      <h2 style={H2_STYLE}>API</h2>
      <p class="text-sm text-muted-foreground mb-3">
        Generated from <code>{`${component}.ts`}</code> - the descriptions are its JSDoc.
      </p>
      <h3 style={H3_STYLE}>Every element</h3>
      <Rows head={['Member', 'Description']} rows={el} />
      <h3 style={H3_STYLE}>Registry</h3>
      <Rows head={['Global', 'Description']} rows={registry} />
      {api.namespaces.map((ns) => (
        <div>
          <h3 style={H3_STYLE}>
            <code>{`df$.shadcn.${ns.name}`}</code>
          </h3>
          {ns.callable ? <p class="text-sm text-muted-foreground mb-2"><code>{`df$.shadcn.${ns.name}${ns.callable.params}`}</code> - {ns.callable.doc}</p> : null}
          {ns.members.length ? <Rows head={['Member', 'Description']} rows={ns.members.map((m) => [{ code: sig(m) }, m.doc])} /> : null}
        </div>
      ))}
      {api.instance ? (
        <div>
          <h3 style={H3_STYLE}>
            The instance (<code>{api.instance.name}</code>)
          </h3>
          <Rows head={['Member', 'Description']} rows={api.instance.members.map((m) => [{ code: sig(m) }, m.doc])} />
        </div>
      ) : null}
      {api.events.length ? (
        <div>
          <h3 style={H3_STYLE}>Events</h3>
          <Rows head={['Event', 'detail', 'Description']} rows={api.events.map((e) => [{ code: e.name }, e.detail.length ? e.detail.join(', ') : '-', e.doc])} />
        </div>
      ) : null}
      {children}
    </section>
  );
}
