# Stripe Connect business category selection

When you create a custom or Express connected account, Stripe asks for the business profile:

- **Industry / business model**: choose the option closest to what the freelancer actually sells. The choice determines what evidence Stripe will request in the verification flow.
- **Examples**:
  - `Digital services / Software` → Stripe expects URLs to landing pages, app stores, GitHub repositories, demo videos, or invoices proving a software service exists. Stripe usually does **not** ask for warehouse photos or proof of physical inventory, but it will pause payouts until you provide at least one credible link and a short explanation of the software or subscription you sell.
  - `Physical goods / Retail` → Stripe expects product photos, inventory proof, shipping policies, and refund policy documents.
  - `Professional services` → Stripe expects contracts, resumes/portfolio links, and documentation of how the service is delivered.
- **Changing the choice**: you can reopen the account details in the Stripe Dashboard and update the industry. After saving, the verification checklist refreshes with the documents that match the new industry.
- **Sandbox vs live**:
  - In test mode, you can provide realistic mock data (URLs, PDFs, images) that simulate the chosen business model.
  - In live mode, you must upload genuine evidence; otherwise, payouts remain restricted.
- **If the wrong industry was selected**: update the industry selection and re-submit the appropriate proof. Stripe will re-evaluate the account and lift restrictions once the documents match the declared business model.
- **Skipping verification?**: Stripe does not offer a "bypass" toggle—even in a thesis or staging environment, payouts stay paused until every required field is filled. In sandbox you can invent plausible sample data, but in live mode the freelancer must eventually supply authentic evidence that matches the business category you picked.

