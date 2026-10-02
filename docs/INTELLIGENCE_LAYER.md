# Intelligence Layer

## Messy Inputs
Staff enter free-text descriptions, varying vendor names, inconsistent amount formats. The system must normalize and enrich these.

## Auto-Structure Schema
```json
{
  "suggested_category": "Software & SaaS",
  "suggested_routine": true,
  "confidence": 0.92,
  "source": "openai:gpt-4o",
  "reasoning": "Keywords: subscription, annual, licenses"
}
```

## Events to Track
- `request.created` — new purchase request submitted
- `request.approved` — approval decision: approved
- `request.rejected` — approval decision: rejected
- `category.suggested` — AI category suggestion generated
- `duplicate.detected` — similar request found (later)

## Scoring Rules (v1, rule-based)
- **Duplicate likelihood:** compare title similarity (trigram) + amount within 10% + same vendor → score 0–1; flag if > 0.7
- **Routine likelihood:** keywords [subscription, monthly, annual, recurring, renewal, license] in description → 1.0; else 0.0
- **Category confidence:** keyword match against category seed list → 0.9; fuzzy match → 0.7; no match → null

## What Gets Ranked
- Pending requests ranked by: amount (high → high priority for review), age (older → higher), routine flag (non-routine → higher).

## v1 vs Later
- **v1:** Manual category selection; routine flag is manual checkbox. AI fields stored but not populated.
- **Later:** AI auto-categorization on submit, duplicate detection warnings, approval recommendation scoring, spending anomaly alerts.
