# RAAH-CARE — Cura Card Emergency Identity Workflow

**Workflow Status:** Verified Implementation  
**Last Updated:** 28 November 2026  

---

## 1. Architectural Principles & Security Model

The **Cura Card** is a digital emergency identity protocol engineered to give first responders immediate, verified access to vital medical baseline data during the "Golden Hour" while maintaining zero exposure of personal identifiable information (PII) to bystanders.

```text
+-------------------+             +-------------------+             +-----------------------+
|    Patient Web    |             |  NestJS Backend   |             | Ambulance / Hospital  |
|  (:5173 /cards)   |             |    (:3000 API)    |             |   Scanner (:5174/75)  |
+-------------------+             +-------------------+             +-----------------------+
          |                                 |                                   |
          | 1. POST /cura-card/token        |                                   |
          |-------------------------------->|                                   |
          |                                 | 2. crypto.randomBytes(32)         |
          |                                 |    tokenHash = sha256(token)      |
          |                                 |    expiresAt = NOW() + 5 min      |
          |                                 |    Insert CuraCardToken           |
          | 3. Returns { qrPayload }        |                                   |
          |<--------------------------------|                                   |
          |                                 |                                   |
          | 4. Render QR on Canvas          |                                   |
          |    (Payload: URL + Token)       |                                   |
          |    Start 5-min Countdown        |                                   |
          |                                 |                                   |
          |                      [ Physical Presentation ]                      |
          |                                 |                                   |
          |                                 |        5. Camera scans QR code    |
          |                                 |---------------------------------->|
          |                                 |        6. Extract raw token string|
          |                                 |                                   |
          |                                 | 7. POST /cura-card/resolve        |
          |                                 |<----------------------------------|
          |                                 |    { token, caseId }              |
          |                                 |    Auth: PARAMEDIC / DOCTOR       |
          |                                 |                                   |
          |                                 | 8. Verify Role Guard              |
          |                                 |    Check hash in CuraCardToken    |
          |                                 |    Check expiresAt > NOW()        |
          |                                 |    Check revokedAt IS NULL        |
          |                                 |    Log CuraCardAudit (SUCCESS)    |
          |                                 |                                   |
          |                                 | 9. Return Medical Record          |
          |                                 |---------------------------------->|
          |                                 |    Blood Group, Allergies,        |
          |                                 |    Conditions, Medications, Phone |
          |                                 |                                   |
          | 10. (Optional) User clicks      |                                   |
          |     "Revoke QR"                 |                                   |
          |-------------------------------->|                                   |
          |     POST /cura-card/revoke      |                                   |
          |     Sets revokedAt = NOW()      |                                   |
```

---

## 2. Key Privacy Guarantees

1. **Zero Raw Data in QR Code**: The QR code never stores plain-text names, blood groups, conditions, or allergies. If scanned by an unauthorized bystander or commercial camera app, it resolves to an unauthenticated landing URL that provides no medical data.
2. **Ephemeral Lifecycle (5 Minutes)**: Tokens expire automatically after 300 seconds. An expired token cannot be resolved even by authorized clinicians.
3. **Instant Revocation**: If the patient loses control of their device or desires privacy, a single click on "Revoke QR" permanently sets `revokedAt = NOW()` in PostgreSQL.
4. **Hashed Persistence**: The backend never stores the raw token string; it only stores the SHA-256 digest (`tokenHash`).
5. **Strict RBAC Enforcement**: Only users with `PARAMEDIC` or `DOCTOR` roles can resolve tokens. Attempting to resolve with a `PATIENT`, `DISPATCHER`, or invalid token logs an `UNAUTHORIZED` audit event.
6. **Regulatory Audit Trail**: Every lookup creates an immutable record in `CuraCardAudit` capturing timestamp, responder ID, responder role, and access outcome (`SUCCESS`, `EXPIRED`, `REVOKED`, `INVALID`, `UNAUTHORIZED`).

---

## 3. Offline & Physical Card Fallback

If a patient's mobile device is unpowered, broken, or in an area without network reception:
- Every patient is assigned a permanent stable Card ID (e.g. `RAAH-CR-91D9FBB9`).
- This ID can be printed on physical wallet cards or wristbands.
- Responders can type the Card ID into the resolver interface or communicate it via radio to dispatch to retrieve the record through official channels.
