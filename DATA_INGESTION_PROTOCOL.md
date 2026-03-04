# BIZRA DATA INGESTION PROTOCOL (DIP)

## Overview
This protocol defines the standard procedure for ingesting data from the "Knowledge Vault" (Downloads, Drives) into the active BIZRA ecosystem. It ensures data integrity, avoids duplication, and maintains system performance.

## 1. The Staging Area
**Location:** `C:\BIZRA-NODE0\ingestion_staging` (To be created)
All data must be moved here before processing. Direct ingestion from `Downloads` is prohibited to prevent accidental system bloat.

## 2. Ingestion Tiers

### Tier 1: High-Value Text (Immediate)
*   **Source Types:** `.json` (Conversations), `.md` (Notes), `.ipynb` (Notebooks).
*   **Target:** Vector Database (ChromaDB/pgvector).
*   **Process:**
    1.  **Sanitization:** Remove PII (if any) and format irregularities.
    2.  **Chunking:** Split into 500-token semantic chunks.
    3.  **Embedding:** Use `nomic-embed-text` (via Ollama) for local embedding.
    4.  **Indexing:** Store in Vector DB with metadata (Source, Date, Drive Location).

### Tier 2: Code Repositories (As Needed)
*   **Source Types:** `.rs`, `.ts`, `.py`, `.sol`.
*   **Target:** `C:\BIZRA-NODE0\legacy_reference`.
*   **Process:**
    1.  **Static Analysis:** Scan for reusable patterns or algorithms.
    2.  **Cataloging:** Add to the "Component Library" index.
    3.  **Archiving:** Zip original source for backup.

### Tier 3: Multimedia & Evidence (On Demand)
*   **Source Types:** `.mp4`, `.png`, `.pdf`.
*   **Target:** `J:\BIZRA_ARCHIVE_VAULT` (Cloud/External Storage).
*   **Process:**
    1.  **Metadata Extraction:** Extract creation date, duration, resolution.
    2.  **Thumbnailing:** Generate previews for the UI.
    3.  **Cold Storage:** Move actual file to external drive; keep only metadata in Node 0.

## 3. The "Expansion Slot" Mapping

| Data Source | Target Slot | Ingestion Priority |
| :--- | :--- | :--- |
| `extracted-history\conversations.json` | **Slot-Alpha** | HIGH - Contains the "Mind" of the project. |
| `flagship-proof-pack` | **Slot-Beta** | MEDIUM - Validation evidence. |
| `J:\My Drive\Bizra_Blockchain_System` | **Slot-Gamma** | MEDIUM - Historical algorithms. |
| `founder-identity.json` | **Slot-Delta** | CRITICAL - Core alignment. |

## 4. Execution Command (Template)
To trigger an ingestion event, the system will use the following CLI structure:

```powershell
# Example: Ingesting the conversation history
./bizra-ingest.ps1 -Source "C:\Users\BIZRA-OS\Downloads\extracted-history\conversations.json" -Tier 1 -Slot Alpha
```

## 5. Verification
Post-ingestion, the system must run a `verify-integrity` check to ensure:
1.  No data corruption.
2.  Vector embeddings are searchable.
3.  Original source is preserved in backup.
