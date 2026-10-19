---
name: Invoice
type: BLK
section: documents
why: The line items stay a semantic Table whose rows carry their values; the runtime numbers, formats (Intl.NumberFormat in the invoice's locale and currency) and adds them up exactly - each line to the cent, the tax once per rate, half away from zero - so the printed totals always match the rows.
when: The body of an invoice, a quote, a credit note or an order confirmation - inside a Letter for a DIN 5008 sheet and a window envelope. A table of figures without totals is a Table; a price list on a website is a Pricing block.
where: dist/components/invoice/invoice.css + dist/components/invoice/invoice.js
supportedStates: default
---

# Pattern: Invoice

## Native basis

A `<section class="invoice">`: a title, the invoice data in a `<dl class="invoice-meta">`,
the line items as a [Table](../table/component-skill.md)
(`<table class="table invoice-items">`) whose body rows carry their values -
`data-quantity`, `data-price` (net unit price), `data-vat` (tax rate in percent) - and
mark the cells the runtime fills with `data-invoice="position|quantity|price|vat|amount"`,
then an empty `<table class="invoice-totals">` the runtime fills with the net sum, one row
per tax rate and the amount due. Payment terms and notes are plain text
(`.invoice-note`); with bank data on the section, a [QR Code](../qr-code/component-skill.md)
in `.invoice-payment` becomes the payment code - an EPC QR code ("GiroCode") that hands the transfer of the
amount due to a banking app. Put it in a [Letter](../letter/component-skill.md)'s `.letter-body`
for the letterhead, the address field and the page geometry.

---

## Native Web APIs
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - currency, quantity and percent in the invoice's locale; the currency's minor unit (EUR 2, JPY 0)
- [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) - exact decimal arithmetic: 3 × 0.335 is 1.005 and rounds to 1.01, not to the 1.00 a float gives
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) - a line added, removed or changed is added up again
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `invoice-totals`
- [`TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder) - the payment code's size in UTF-8 bytes (at most 331)
- [`<thead>` repeated in print](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead) - the header row on every printed page (Table's print rules)
- [`break-before`](https://developer.mozilla.org/en-US/docs/Web/CSS/break-before) - the totals never start a page alone
- [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<section class="invoice" data-currency="EUR" lang="de" aria-labelledby="inv-title"
  data-iban="DE02 1203 0000 0000 2020 51" data-bic="BYLADEM1001" data-payee="Beispiel GmbH"
  data-remittance="Rechnung 2026-0142">
  <h2 class="invoice-title" id="inv-title">Rechnung 2026-0142</h2>
  <dl class="invoice-meta">
    <div><dt>Rechnungsnummer</dt><dd>2026-0142</dd></div>
    <div><dt>Rechnungsdatum</dt><dd><time datetime="2026-10-12">12.10.2026</time></dd></div>
    <div><dt>Leistungszeitraum</dt><dd>September 2026</dd></div>
  </dl>
  <div class="table-container">
    <table class="table invoice-items" data-keep-last>
      <thead>
        <tr class="table-row">
          <th class="table-head" scope="col" data-numeric>Pos.</th>
          <th class="table-head" scope="col">Leistung</th>
          <th class="table-head" scope="col" data-numeric>Menge</th>
          <th class="table-head" scope="col">Einheit</th>
          <th class="table-head" scope="col" data-numeric>Einzelpreis</th>
          <th class="table-head" scope="col" data-numeric>USt.</th>
          <th class="table-head" scope="col" data-numeric>Betrag</th>
        </tr>
      </thead>
      <tbody>
        <tr class="table-row" data-quantity="12" data-price="95.00" data-vat="19">
          <td class="table-cell" data-numeric data-invoice="position"></td>
          <td class="table-cell">Konzeption</td>
          <td class="table-cell" data-numeric data-invoice="quantity"></td>
          <td class="table-cell">Std.</td>
          <td class="table-cell" data-numeric data-invoice="price"></td>
          <td class="table-cell" data-numeric data-invoice="vat"></td>
          <td class="table-cell" data-numeric data-invoice="amount"></td>
        </tr>
      </tbody>
    </table>
  </div>
  <table class="invoice-totals" aria-label="Summen"></table>
  <div class="invoice-payment">
    <figure class="qr-code" data-ecc="M" data-size="sm" hidden>
      <div class="qr-code-symbol" role="img" aria-label="GiroCode: Überweisung des Rechnungsbetrags"></div>
      <output class="qr-code-status" hidden></output>
    </figure>
    <p class="invoice-note">Zahlbar innerhalb von 14 Tagen ohne Abzug - oder den GiroCode mit Ihrer Banking-App scannen.</p>
  </div>
</section>
```

- Values are machine values: a dot for decimals (`"18.5"`, `"0.125"`), the rate in percent (`"19"`, `"7"`, `"0"`), a negative quantity for a credit.
- A body row without `data-price` (a heading row, a text line) is no line: it is neither numbered nor added up.
- The cells a row does not mark stay as written (description, unit); a cell may hold a fallback text for readers without JavaScript - the runtime replaces it.
- The payment code is optional: without `data-iban` and `.invoice-payment` the invoice has none. Author the QR Code `hidden` - a reader without JavaScript gets no code without an amount; the runtime shows it.

---

## Variants

| Attribute | On | Values | Effect |
| --- | --- | --- | --- |
| `lang` | `.invoice` or an ancestor | BCP 47 | the locale numbers are formatted in, and the words of the totals (`de` built in, every other language English until `df$.shadcn.invoice.labels()` adds it) |
| `data-currency` | `.invoice` | ISO 4217 | the currency (default `EUR`); amounts round to its minor unit |
| `data-locale` | `.invoice` | BCP 47 | written by the runtime: the locale in use (a state's config can set it) |
| `data-keep-last` | `.invoice-items` | - | Table's print rule: the last three rows stay with the totals |
| `data-iban` | `.invoice` | IBAN | the beneficiary's account for the payment code; spaces allowed, its check digits are checked |
| `data-payee` | `.invoice` | text | the beneficiary's name in the payment code, at most 70 characters |
| `data-bic` | `.invoice` | BIC | the beneficiary bank's BIC (8 or 11 characters); optional inside the EEA |
| `data-remittance` | `.invoice` | text | the remittance information (Verwendungszweck), at most 140 characters - the invoice number |

## Sizes

None of its own: the invoice takes the size of the text around it (a Letter sets 11pt); the
items and the totals are set at 0.9em.

---

## States

| State | Meaning |
|-------|---------|
| `default` | The invoice formatted and added up in the locale and currency of `config` (`data-locale` / `data-currency` on the section) |

```js
const invoice = document.querySelector('#invoice');
invoice.api.setState('default', { locale: 'en-US' });   // English formatting, the currency stays EUR
invoice.api.setState('default', { currency: 'USD' });
invoice.addEventListener('invoice-totals', (e) => console.log(e.detail.totals.total)); // "3502.62"
df$.shadcn.invoice.compute([{ quantity: 3, price: '0.335', vat: 19 }]); // lines ["1.01"], taxes [{ rate: "19", base: "1.01", tax: "0.19" }]
```

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type InvoiceState = 'default'</code> - `setState(name, config)` takes the config of the state it names (`InvoiceStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The invoice formatted and added up. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>locale?</code></td><td><code>string</code></td><td>the locale to format in (a BCP 47 tag); default: the nearest lang attribute, else en-US</td></tr><tr><td><code>currency?</code></td><td><code>string</code></td><td>the ISO 4217 currency code; default: the invoice's data-currency, else EUR</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends InvoiceState&gt;(name: S, config?: InvoiceStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>InvoiceStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.invoiceApi.setState&lt;S extends InvoiceState&gt;(el: HTMLElement, name: S, config?: InvoiceStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>InvoiceStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.invoiceApi.getState(el: HTMLElement): { name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.invoiceApi.render(state: { name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.invoiceApi.store(el: HTMLElement): Store&lt;{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: InvoiceState; config: InvoiceStateConfigs[InvoiceState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.invoiceApi.commit&lt;S extends InvoiceState&gt;(el: HTMLElement, name: S, config?: InvoiceStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>InvoiceStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.invoiceStates: InvoiceState[]</code> | The declared states, 'default' first: <code>default</code>. |

### `df$.shadcn.invoice`

| Member | Description |
|---|---|
| <code>compute(lines: InvoiceLine[], currency?: string): InvoiceTotals</code> | Add up invoice lines the way the invoice does - each amount rounded to the currency's minor unit, the tax once per rate on that rate's net sum, half away from zero. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>lines</code></td><td><code>InvoiceLine[]</code></td><td>the lines: quantity, net unit price and tax rate in percent (decimal strings with a dot, or numbers)</td></tr><tr><td><code>currency?</code></td><td><code>string</code></td><td>the ISO 4217 code whose minor unit amounts round to (default EUR)</td></tr></table> <b>Returns</b> <code>InvoiceTotals</code> - every line amount, the net sum, the tax per rate and the total, as decimal strings - a value that is no number throws a RangeError naming its line and field |
| <code>epc(transfer: EpcTransfer): string</code> | The text of an EPC QR code ("GiroCode") for a SEPA credit transfer - what an invoice's payment code carries for its amount due; put it into a QR Code's data-value with data-ecc="M" for a code of your own. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>transfer</code></td><td><code>EpcTransfer</code></td><td>the beneficiary's IBAN and name, the amount in euro, optionally the BIC and the remittance text</td></tr></table> <b>Returns</b> <code>string</code> - the code's text (EPC069-12 version 002, UTF-8, one element per line) - a value the code cannot carry (an IBAN with wrong check digits, a name over 70 characters, an amount outside 0.01 to 999999999.99, more than 331 bytes) throws a RangeError naming it |
| <code>totals(target: string \| HTMLElement): InvoiceTotals \| null</code> | The totals an invoice element shows now. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .invoice element or its selector</td></tr></table> <b>Returns</b> <code>InvoiceTotals \| null</code> - its totals as decimal strings, or null before it initialized and while a line holds a value that is no number |
| <code>labels(lang: string, labels: Partial&lt;InvoiceLabels&gt;): void</code> | Add or change the words of the totals for a language; invoices in that language re-render. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>lang</code></td><td><code>string</code></td><td>a language subtag ("fr") or a tag whose subtag counts ("fr-CH")</td></tr><tr><td><code>labels</code></td><td><code>Partial&lt;InvoiceLabels&gt;</code></td><td>the words to set; the rest keep their current value (English for a new language)</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `invoice-totals` | Fires after the invoice was formatted and added up - at init, on setState, and when a line row or its values change. <code>detail</code>: <code>InvoiceTotalsDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>locale</code></td><td><code>string</code></td><td>the locale the invoice is formatted in (a BCP 47 tag)</td></tr><tr><td><code>totals</code></td><td><code>InvoiceTotals \| null</code></td><td>the totals as decimal strings - see InvoiceTotals; null while a line holds a value that is no number</td></tr><tr><td><code>error</code></td><td><code>string</code></td><td>why there are no totals ("line 3: price "12,50" is no number ..."), '' when there are</td></tr><tr><td><code>payment</code></td><td><code>string</code></td><td>the text of the payment code - an EPC QR code for the amount due (see epc()); '' when the invoice has none</td></tr><tr><td><code>paymentError</code></td><td><code>string</code></td><td>why there is no payment code although the section carries data-iban ("payment code: nothing is due"), '' otherwise</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `EpcTransfer` | A SEPA credit transfer as an EPC QR code ("GiroCode") carries it - EPC069-12, version 002. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>iban</code></td><td><code>string</code></td><td>the beneficiary's IBAN; spaces and lower case are allowed</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the beneficiary's name, at most 70 characters</td></tr><tr><td><code>amount</code></td><td><code>string \| number</code></td><td>the amount in euro - a decimal string with a dot ("3502.62") or a number, 0.01 to 999999999.99, at most two decimals</td></tr><tr><td><code>bic?</code></td><td><code>string</code></td><td>the BIC of the beneficiary's bank, 8 or 11 characters - optional inside the EEA</td></tr><tr><td><code>remittance?</code></td><td><code>string</code></td><td>the remittance information (Verwendungszweck), at most 140 characters</td></tr></table> |
| `InvoiceLabels` | The words the runtime writes into the totals; {rate} and {base} are filled in. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>net</code></td><td><code>string</code></td><td>the net sum row ("Summe netto", "Subtotal")</td></tr><tr><td><code>tax</code></td><td><code>string</code></td><td>one row per tax rate ("zzgl. {rate} USt auf {base}", "Tax {rate} on {base}")</td></tr><tr><td><code>total</code></td><td><code>string</code></td><td>the amount due ("Rechnungsbetrag", "Total")</td></tr></table> |
| `InvoiceLine` | One line of an invoice: decimal strings with a dot ("1.5", "95.00", "19"), or numbers. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>quantity</code></td><td><code>string \| number</code></td><td>the quantity (may be fractional, negative for a credit)</td></tr><tr><td><code>price</code></td><td><code>string \| number</code></td><td>the net unit price in the invoice's currency</td></tr><tr><td><code>vat</code></td><td><code>string \| number</code></td><td>the tax rate in percent (19, 7, 0, 8.875)</td></tr></table> |
| `InvoiceTax` | The tax of one rate. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>rate</code></td><td><code>string</code></td><td>the rate in percent, as written ("19")</td></tr><tr><td><code>base</code></td><td><code>string</code></td><td>the net sum of the lines at this rate (a decimal string in the currency's minor unit: "1800.00")</td></tr><tr><td><code>tax</code></td><td><code>string</code></td><td>the tax on that sum, rounded half away from zero ("342.00")</td></tr></table> |
| `InvoiceTotals` | What an invoice adds up to - every amount a decimal string in the currency's minor unit. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>currency</code></td><td><code>string</code></td><td>the ISO 4217 currency code</td></tr><tr><td><code>digits</code></td><td><code>number</code></td><td>the currency's minor-unit digits (EUR 2, JPY 0)</td></tr><tr><td><code>lines</code></td><td><code>string[]</code></td><td>each line's net amount, in line order, rounded half away from zero</td></tr><tr><td><code>net</code></td><td><code>string</code></td><td>the net sum of all lines</td></tr><tr><td><code>taxes</code></td><td><code>InvoiceTax[]</code></td><td>one entry per tax rate above zero, in order of first appearance</td></tr><tr><td><code>total</code></td><td><code>string</code></td><td>the amount due: net sum plus every tax</td></tr></table> |
| `InvoiceTotalsDetail` | What invoice-totals carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>locale</code></td><td><code>string</code></td><td>the locale the invoice is formatted in (a BCP 47 tag)</td></tr><tr><td><code>totals</code></td><td><code>InvoiceTotals \| null</code></td><td>the totals as decimal strings - see InvoiceTotals; null while a line holds a value that is no number</td></tr><tr><td><code>error</code></td><td><code>string</code></td><td>why there are no totals ("line 3: price "12,50" is no number ..."), '' when there are</td></tr><tr><td><code>payment</code></td><td><code>string</code></td><td>the text of the payment code - an EPC QR code for the amount due (see epc()); '' when the invoice has none</td></tr><tr><td><code>paymentError</code></td><td><code>string</code></td><td>why there is no payment code although the section carries data-iban ("payment code: nothing is due"), '' otherwise</td></tr></table> |

---

## ARIA

| Element | Attribute | Notes |
| --- | --- | --- |
| `.invoice` | `aria-labelledby` | names the section by its title |
| `.invoice-meta` | `<dl>` | label / value pairs, each in a `<div>` |
| `.invoice-items` | `scope="col"` | header cells name their columns (Table) |
| `.invoice-totals` | `aria-label` | the totals table; the runtime writes each row as a `<th scope="row">` label and a value |

---

## Notes

- **Rounding** - as usual in Germany: each line amount (quantity × unit price) rounds to the currency's minor unit; the tax is computed once per rate on that rate's net sum and rounds the same way; the amount due is the net sum plus the taxes. Rounding is half away from zero (kaufmännisch), also for credits. Three lines of 0.03 € at 19 % tax 0.02 € (0.09 × 19 % = 0.0171), not the 0.03 € that rounding each line's tax would give.
- **Locales** - German first, English second: `lang="de"` writes "Summe netto", "zzgl. 19 % USt auf ...", "Rechnungsbetrag"; every other language "Subtotal", "Tax 19% on ...", "Total". `df$.shadcn.invoice.labels('fr', { net: 'Total HT', tax: 'TVA {rate} sur {base}', total: 'Total TTC' })` adds a language. The column headers and the invoice data are your text - write them in the invoice's language.
- **Print** - the items table runs over pages with its header row on every page and its rows whole (Table's print rules); the totals never start a page alone. In a Letter the first page carries the letterhead and the address field, later pages "Seite 2 von 3".
- **Content** - the component adds up what the rows say; it does not know a country's invoice requirements (sequential number, tax IDs, delivery date, exemption notes). Write them into `.invoice-meta` and `.invoice-note`.
- **A wrong number never counts as 0** - a value that is no number (`data-price="12,50"` with a comma) marks its row (`data-invalid`), leaves its cells empty and puts the reason in place of the totals ("line 3: price "12,50" is no number ..."); `totals()` returns null and `invoice-totals` carries the reason as `error` until the value is fixed. `compute()` throws a RangeError for it.
- **Without JavaScript** - the rows and their descriptions read as written; the marked cells and the totals stay empty unless you write fallback text into them.
- **Payment code** - the EPC QR code a European banking app reads as a SEPA credit transfer (EPC069-12 version 002, UTF-8): BIC, name, IBAN, `EUR` and the amount due, the remittance text, one element per line. The runtime writes it into the QR Code's `data-value` with `data-ecc="M"` (the error level the guideline requires; its 331-byte limit keeps the code at version 13 or below) and updates it when the totals or the bank data attributes change. It hides the code when there is no transfer: another currency than the euro, nothing due (a credit note), no totals. Bank data the code cannot carry (an IBAN whose check digits fail, a BIC that is no BIC, a name over 70 or a remittance over 140 characters) is named under the totals and in `invoice-totals`' `paymentError`, never cut short. Print the IBAN and the amount as text as well - the guideline asks for the code beside the same data in plain text, so the payer can compare. `df$.shadcn.invoice.epc()` writes the text for a code of your own.
