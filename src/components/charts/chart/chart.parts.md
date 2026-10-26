<!-- The individual examples of Chart: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Chart"
<div
  class="chart"
  role="img"
  aria-label="Bar chart of quarterly revenue, rising from 12 to 24"
  data-chart='{"xAxis":{"type":"category","data":["Q1","Q2","Q3","Q4"]},"yAxis":{"type":"value"},"series":[{"id":"rev","type":"bar","universalTransition":true,"barWidth":"48%","label":{"show":true,"position":"top","fontWeight":600},"data":[12,19,15,24]}]}'
></div>
```

```html example part label="Chart (sm)"
<div
  id="calendar-chart"
  class="chart"
  data-size="sm"
  role="img"
  aria-label="Calendar heatmap of daily activity for the year 2026, values from 0 to about 58"
></div>
```

```html example part label="Chart (lg)"
<div
  class="chart"
  data-size="lg"
  role="img"
  aria-label="Small multiples: six regional trend lines on a shared 10 to 60 scale, Metro rising fastest"
></div>
```
