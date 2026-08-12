# Canonical Curriculum Matrix — Batch 03 Metadata Corrections

The lesson identities, titles, passages, sequence numbers, and big ideas remain unchanged. These proposals affect classification metadata only.

## 1. T1-L07 — Noah: Judgment, Mercy, and New Beginning

### Current matrix metadata
- `doctrine_tags`: `sin, covenant, eschatology`
- `theological_review_flag`: `TH-ESCHATOLOGY`
- `pastoral_sensitivity`: `Violence/war, Judgment/hell`

### Problem
The lesson's principal work is flood narrative, human corruption, judgment, preservation, covenant, creation renewal, and unresolved sin. Eschatology alone is too narrow, and `Violence/war` misstates the pastoral issue. The sensitive material is judgment, death, and disaster.

### Proposed metadata
- `doctrine_tags`: `sin, covenant, judgment, mercy, creation`
- `theological_review_flag`: `TH-JUDGMENT, TH-COVENANT, TH-CREATION`
- `pastoral_sensitivity`: `Judgment/death, Disaster`

## 2. T1-L08 — Abraham and the Architecture of Promise

### Current matrix metadata
- `biblical_era`: `Apostolic churches`
- `biblical_genre`: `Epistle`
- `doctrine_tags`: `sin, covenant, christology, ethics`
- `theological_review_flag`: `TH-VIOLENCE`
- `pastoral_sensitivity`: `Violence/war`

### Problem
The lesson begins in the patriarchal narratives and uses Galatians as an apostolic interpretation of the Abrahamic promise. It is not a violence lesson. The current era, genre, review flag, and pastoral sensitivity would route editors toward the wrong review process.

### Proposed metadata
- `biblical_era`: `Creation and Patriarchs / Apostolic interpretation`
- `biblical_genre`: `Biblical narrative / covenant and epistle`
- `doctrine_tags`: `covenant, promise, christology, mission, faith`
- `theological_review_flag`: `TH-COVENANT, TH-CHRISTOLOGY, TH-ISRAEL-CHURCH`
- `pastoral_sensitivity`: blank

## 3. T1-L09 — Exodus, Passover, and Deliverance

### Current matrix metadata
- `doctrine_tags`: `scripture`
- `theological_review_flag`: `TH-BIBLIOLOGY`
- `pastoral_sensitivity`: blank

### Problem
The lesson concerns Exodus deliverance, Passover, judgment, covenant identity, later biblical reuse, and responsible typology. Bibliology alone does not identify the substantive review required, and the severity of Passover judgment warrants a pastoral flag.

### Proposed metadata
- `doctrine_tags`: `salvation, covenant, judgment, worship, biblical_theology`
- `theological_review_flag`: `TH-SALVATION, TH-ATONEMENT, TH-BIBLICAL-THEOLOGY`
- `pastoral_sensitivity`: `Judgment/death`

## Implementation

Apply these changes through a controlled canonical-matrix revision. Review the accompanying machine-readable patch before applying it. Generated lesson records already use content-specific flags but do not modify the canonical matrix automatically.
