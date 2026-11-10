# AI Guidelines (S-01)

These guidelines govern all AI-assisted development across the StockOnChain repository. GitHub issues, pull requests, and code reviews reference these guidelines by number (G1–G10).

---

### • G1 No secrets
Stellar secret keys (they start with S), .env files, wallet encryption keys and API keys never go into an AI tool.

### • G2 Human in the loop
The author reads and understands every AI-generated line, and the reviewer treats it like any other code.

### • G3 Chain code
AI-written Rust, Soroban and Stellar SDK code is compiled, tested and read line by line before merging. These tools change fast and AI often produces outdated APIs, so pin versions and check every call against the current official docs. No unbounded loops or unbounded storage growth, and extend storage TTLs deliberately.

### • G4 Verify, do not trust
Package names, network URLs, SEP details, laws, rates and statistics are checked against official sources. AI is never the source of a figure, quote or citation. Record sources in the docs.

### • G5 Testnet only
Every script asserts the testnet passphrase and refuses to run otherwise. No mainnet keys. Mock assets are labelled MOCK.

### • G6 Honesty
Mocked layers (T-bill, SPV, custodian, dealer, KYC, payout rails) are labelled in the UI and README. We never claim licences, audits, partnerships, real yields, or that testnet tokens are real securities. Yield is indicative and not guaranteed.

### • G7 Data protection (POPIA)
No real personal data in prompts, seed data or logs. Synthetic data only.

### • G8 Licensing
Check licences for code, fonts, icons and images that AI suggests.

### • G9 Scope control
AI must not add features or dependencies outside the issue. Agree new dependencies in the issue thread first.

### • G10 Transparency
Log notable prompts and what changed in `docs/AI_LOG.md`.

