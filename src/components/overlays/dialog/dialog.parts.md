<!-- The individual examples of Dialog: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Dialog"
<dialog id="density-comfortable-dialog" class="dialog" aria-labelledby="density-comfortable-dialog-title">
  <div class="dialog-content">
    <div class="dialog-header">
      <h3 class="dialog-title" id="density-comfortable-dialog-title">Comfortable</h3>
      <p class="dialog-description">Content padding 1.5rem - matches the unsized default.</p>
    </div>
    <button class="btn" data-variant="outline" data-dialog-close="">Close</button>
  </div>
</dialog>
```

```html example part label="Dialog (lg)"
<dialog class="dialog" id="q-dialog" data-size="lg" aria-labelledby="q-dialog-title">
  <div class="dialog-content">
    <div class="dialog-header">
      <h2 class="dialog-title" id="q-dialog-title">Report a problem</h2>
    </div>
    <form class="questionnaire" id="q-report" aria-labelledby="q-dialog-title">
      <div class="questionnaire-progress"></div>
      <fieldset class="questionnaire-step" data-step="area">
        <legend class="questionnaire-title">Where did it happen?</legend>
        <div class="questionnaire-choices">
          <label class="questionnaire-choice"
            ><input type="radio" name="area" value="web" required /><span class="questionnaire-choice-label"
              >The website</span
            ></label
          >
          <label class="questionnaire-choice"
            ><input type="radio" name="area" value="app" /><span class="questionnaire-choice-label"
              >The mobile app</span
            ></label
          >
        </div>
      </fieldset>
      <fieldset class="questionnaire-step" data-step="what">
        <legend class="questionnaire-title">What went wrong?</legend>
        <textarea class="textarea" name="what" rows="3" required aria-label="What went wrong"></textarea>
      </fieldset>
      <fieldset class="questionnaire-step" data-step="send" data-end="">
        <legend class="questionnaire-title">Send this report?</legend>
        <div class="questionnaire-summary"></div>
      </fieldset>
      <div class="questionnaire-actions">
        <button class="btn" data-variant="ghost" type="button" data-questionnaire="back">Back</button>
        <button class="btn" type="submit" data-questionnaire="next">Next</button>
        <button class="btn" type="submit" data-questionnaire="submit">Send report</button>
      </div>
    </form>
  </div>
</dialog>
```
