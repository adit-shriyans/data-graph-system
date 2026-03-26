-- SAP O2C Graph Database Schema

-- ============================================================
-- Master Data
-- ============================================================

CREATE TABLE IF NOT EXISTS business_partners (
  business_partner       TEXT PRIMARY KEY,
  customer               TEXT,
  business_partner_category TEXT,
  business_partner_full_name TEXT,
  business_partner_grouping TEXT,
  business_partner_name  TEXT,
  correspondence_language TEXT,
  created_by_user        TEXT,
  creation_date          TIMESTAMPTZ,
  creation_time          TEXT,
  first_name             TEXT,
  form_of_address        TEXT,
  industry               TEXT,
  last_change_date       TIMESTAMPTZ,
  last_name              TEXT,
  organization_bp_name1  TEXT,
  organization_bp_name2  TEXT,
  business_partner_is_blocked BOOLEAN,
  is_marked_for_archiving BOOLEAN
);
CREATE INDEX IF NOT EXISTS idx_bp_customer ON business_partners(customer);

CREATE TABLE IF NOT EXISTS business_partner_addresses (
  business_partner       TEXT NOT NULL,
  address_id             TEXT NOT NULL,
  validity_start_date    TIMESTAMPTZ,
  validity_end_date      TIMESTAMPTZ,
  address_uuid           TEXT,
  address_time_zone      TEXT,
  city_name              TEXT,
  country                TEXT,
  po_box                 TEXT,
  po_box_deviating_city_name TEXT,
  po_box_deviating_country TEXT,
  po_box_deviating_region TEXT,
  po_box_is_without_number BOOLEAN,
  po_box_lobby_name      TEXT,
  po_box_postal_code     TEXT,
  postal_code            TEXT,
  region                 TEXT,
  street_name            TEXT,
  tax_jurisdiction       TEXT,
  transport_zone         TEXT,
  PRIMARY KEY (business_partner, address_id)
);

CREATE TABLE IF NOT EXISTS customer_company_assignments (
  customer               TEXT NOT NULL,
  company_code           TEXT NOT NULL,
  accounting_clerk       TEXT,
  accounting_clerk_fax_number TEXT,
  accounting_clerk_internet_address TEXT,
  accounting_clerk_phone_number TEXT,
  alternative_payer_account TEXT,
  payment_blocking_reason TEXT,
  payment_methods_list   TEXT,
  payment_terms          TEXT,
  reconciliation_account TEXT,
  deletion_indicator     BOOLEAN,
  customer_account_group TEXT,
  PRIMARY KEY (customer, company_code)
);

CREATE TABLE IF NOT EXISTS customer_sales_area_assignments (
  customer               TEXT NOT NULL,
  sales_organization     TEXT NOT NULL,
  distribution_channel   TEXT NOT NULL,
  division               TEXT NOT NULL,
  billing_is_blocked_for_customer TEXT,
  complete_delivery_is_defined BOOLEAN,
  credit_control_area    TEXT,
  currency               TEXT,
  customer_payment_terms TEXT,
  delivery_priority      TEXT,
  incoterms_classification TEXT,
  incoterms_location1    TEXT,
  sales_group            TEXT,
  sales_office           TEXT,
  shipping_condition     TEXT,
  sls_unlmtd_ovrdeliv_is_allwd BOOLEAN,
  supplying_plant        TEXT,
  sales_district         TEXT,
  exchange_rate_type     TEXT,
  PRIMARY KEY (customer, sales_organization, distribution_channel, division)
);

CREATE TABLE IF NOT EXISTS plants (
  plant                  TEXT PRIMARY KEY,
  plant_name             TEXT,
  valuation_area         TEXT,
  plant_customer         TEXT,
  plant_supplier         TEXT,
  factory_calendar       TEXT,
  default_purchasing_organization TEXT,
  sales_organization     TEXT,
  address_id             TEXT,
  plant_category         TEXT,
  distribution_channel   TEXT,
  division               TEXT,
  language               TEXT,
  is_marked_for_archiving BOOLEAN
);

CREATE TABLE IF NOT EXISTS products (
  product                TEXT PRIMARY KEY,
  product_type           TEXT,
  cross_plant_status     TEXT,
  cross_plant_status_validity_date TIMESTAMPTZ,
  creation_date          TIMESTAMPTZ,
  created_by_user        TEXT,
  last_change_date       TIMESTAMPTZ,
  last_change_date_time  TIMESTAMPTZ,
  is_marked_for_deletion BOOLEAN,
  product_old_id         TEXT,
  gross_weight           TEXT,
  weight_unit            TEXT,
  net_weight             TEXT,
  product_group          TEXT,
  base_unit              TEXT,
  division               TEXT,
  industry_sector        TEXT
);

CREATE TABLE IF NOT EXISTS product_descriptions (
  product                TEXT NOT NULL,
  language               TEXT NOT NULL,
  product_description    TEXT,
  PRIMARY KEY (product, language)
);

CREATE TABLE IF NOT EXISTS product_plants (
  product                TEXT NOT NULL,
  plant                  TEXT NOT NULL,
  country_of_origin      TEXT,
  region_of_origin       TEXT,
  production_invtry_managed_loc TEXT,
  availability_check_type TEXT,
  fiscal_year_variant    TEXT,
  profit_center          TEXT,
  mrp_type               TEXT,
  PRIMARY KEY (product, plant)
);

CREATE TABLE IF NOT EXISTS product_storage_locations (
  product                TEXT NOT NULL,
  plant                  TEXT NOT NULL,
  storage_location       TEXT NOT NULL,
  physical_inventory_block_ind TEXT,
  date_of_last_posted_cnt_un_rstrcd_stk TIMESTAMPTZ,
  PRIMARY KEY (product, plant, storage_location)
);

-- ============================================================
-- Sales Orders
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_order_headers (
  sales_order            TEXT PRIMARY KEY,
  sales_order_type       TEXT,
  sales_organization     TEXT,
  distribution_channel   TEXT,
  organization_division  TEXT,
  sales_group            TEXT,
  sales_office           TEXT,
  sold_to_party          TEXT,
  creation_date          TIMESTAMPTZ,
  created_by_user        TEXT,
  last_change_date_time  TIMESTAMPTZ,
  total_net_amount       NUMERIC,
  overall_delivery_status TEXT,
  overall_ord_reltd_billg_status TEXT,
  overall_sd_doc_reference_status TEXT,
  transaction_currency   TEXT,
  pricing_date           TIMESTAMPTZ,
  requested_delivery_date TIMESTAMPTZ,
  header_billing_block_reason TEXT,
  delivery_block_reason  TEXT,
  incoterms_classification TEXT,
  incoterms_location1    TEXT,
  customer_payment_terms TEXT,
  total_credit_check_status TEXT
);
CREATE INDEX IF NOT EXISTS idx_soh_sold_to ON sales_order_headers(sold_to_party);

CREATE TABLE IF NOT EXISTS sales_order_items (
  sales_order            TEXT NOT NULL,
  sales_order_item       TEXT NOT NULL,
  sales_order_item_category TEXT,
  material               TEXT,
  requested_quantity     TEXT,
  requested_quantity_unit TEXT,
  transaction_currency   TEXT,
  net_amount             NUMERIC,
  material_group         TEXT,
  production_plant       TEXT,
  storage_location       TEXT,
  sales_document_rjcn_reason TEXT,
  item_billing_block_reason TEXT,
  PRIMARY KEY (sales_order, sales_order_item)
);
CREATE INDEX IF NOT EXISTS idx_soi_material ON sales_order_items(material);
CREATE INDEX IF NOT EXISTS idx_soi_plant ON sales_order_items(production_plant);

CREATE TABLE IF NOT EXISTS sales_order_schedule_lines (
  sales_order            TEXT NOT NULL,
  sales_order_item       TEXT NOT NULL,
  schedule_line          TEXT NOT NULL,
  confirmed_delivery_date TIMESTAMPTZ,
  order_quantity_unit    TEXT,
  confd_order_qty_by_matl_avail_check TEXT,
  PRIMARY KEY (sales_order, sales_order_item, schedule_line)
);

-- ============================================================
-- Outbound Deliveries
-- ============================================================

CREATE TABLE IF NOT EXISTS outbound_delivery_headers (
  delivery_document      TEXT PRIMARY KEY,
  actual_goods_movement_date TIMESTAMPTZ,
  actual_goods_movement_time TEXT,
  creation_date          TIMESTAMPTZ,
  creation_time          TEXT,
  delivery_block_reason  TEXT,
  hdr_general_incompletion_status TEXT,
  header_billing_block_reason TEXT,
  last_change_date       TIMESTAMPTZ,
  overall_goods_movement_status TEXT,
  overall_picking_status TEXT,
  overall_proof_of_delivery_status TEXT,
  shipping_point         TEXT
);

CREATE TABLE IF NOT EXISTS outbound_delivery_items (
  delivery_document      TEXT NOT NULL,
  delivery_document_item TEXT NOT NULL,
  actual_delivery_quantity TEXT,
  batch                  TEXT,
  delivery_quantity_unit TEXT,
  item_billing_block_reason TEXT,
  last_change_date       TIMESTAMPTZ,
  plant                  TEXT,
  reference_sd_document  TEXT,
  reference_sd_document_item TEXT,
  storage_location       TEXT,
  PRIMARY KEY (delivery_document, delivery_document_item)
);
CREATE INDEX IF NOT EXISTS idx_odi_ref ON outbound_delivery_items(reference_sd_document);
CREATE INDEX IF NOT EXISTS idx_odi_plant ON outbound_delivery_items(plant);

-- ============================================================
-- Billing Documents
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_document_headers (
  billing_document       TEXT PRIMARY KEY,
  billing_document_type  TEXT,
  creation_date          TIMESTAMPTZ,
  creation_time          TEXT,
  last_change_date_time  TIMESTAMPTZ,
  billing_document_date  TIMESTAMPTZ,
  billing_document_is_cancelled BOOLEAN,
  cancelled_billing_document TEXT,
  total_net_amount       NUMERIC,
  transaction_currency   TEXT,
  company_code           TEXT,
  fiscal_year            TEXT,
  accounting_document    TEXT,
  sold_to_party          TEXT
);
CREATE INDEX IF NOT EXISTS idx_bdh_sold_to ON billing_document_headers(sold_to_party);
CREATE INDEX IF NOT EXISTS idx_bdh_acct_doc ON billing_document_headers(company_code, fiscal_year, accounting_document);

CREATE TABLE IF NOT EXISTS billing_document_items (
  billing_document       TEXT NOT NULL,
  billing_document_item  TEXT NOT NULL,
  material               TEXT,
  billing_quantity       TEXT,
  billing_quantity_unit  TEXT,
  net_amount             NUMERIC,
  transaction_currency   TEXT,
  reference_sd_document  TEXT,
  reference_sd_document_item TEXT,
  PRIMARY KEY (billing_document, billing_document_item)
);
CREATE INDEX IF NOT EXISTS idx_bdi_ref ON billing_document_items(reference_sd_document);
CREATE INDEX IF NOT EXISTS idx_bdi_material ON billing_document_items(material);

CREATE TABLE IF NOT EXISTS billing_document_cancellations (
  billing_document       TEXT PRIMARY KEY,
  billing_document_type  TEXT,
  creation_date          TIMESTAMPTZ,
  creation_time          TEXT,
  last_change_date_time  TIMESTAMPTZ,
  billing_document_date  TIMESTAMPTZ,
  billing_document_is_cancelled BOOLEAN,
  cancelled_billing_document TEXT,
  total_net_amount       NUMERIC,
  transaction_currency   TEXT,
  company_code           TEXT,
  fiscal_year            TEXT,
  accounting_document    TEXT,
  sold_to_party          TEXT
);

-- ============================================================
-- Financial Accounting (AR)
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entry_items_ar (
  company_code           TEXT NOT NULL,
  fiscal_year            TEXT NOT NULL,
  accounting_document    TEXT NOT NULL,
  accounting_document_item TEXT NOT NULL,
  gl_account             TEXT,
  reference_document     TEXT,
  cost_center            TEXT,
  profit_center          TEXT,
  transaction_currency   TEXT,
  amount_in_transaction_currency NUMERIC,
  company_code_currency  TEXT,
  amount_in_company_code_currency NUMERIC,
  posting_date           TIMESTAMPTZ,
  document_date          TIMESTAMPTZ,
  accounting_document_type TEXT,
  assignment_reference   TEXT,
  last_change_date_time  TIMESTAMPTZ,
  customer               TEXT,
  financial_account_type TEXT,
  clearing_date          TIMESTAMPTZ,
  clearing_accounting_document TEXT,
  clearing_doc_fiscal_year TEXT,
  PRIMARY KEY (company_code, fiscal_year, accounting_document, accounting_document_item)
);
CREATE INDEX IF NOT EXISTS idx_jeia_ref_doc ON journal_entry_items_ar(reference_document);
CREATE INDEX IF NOT EXISTS idx_jeia_customer ON journal_entry_items_ar(customer);

CREATE TABLE IF NOT EXISTS payments_ar (
  company_code           TEXT NOT NULL,
  fiscal_year            TEXT NOT NULL,
  accounting_document    TEXT NOT NULL,
  accounting_document_item TEXT NOT NULL,
  clearing_date          TIMESTAMPTZ,
  clearing_accounting_document TEXT,
  clearing_doc_fiscal_year TEXT,
  amount_in_transaction_currency NUMERIC,
  transaction_currency   TEXT,
  amount_in_company_code_currency NUMERIC,
  company_code_currency  TEXT,
  customer               TEXT,
  invoice_reference      TEXT,
  invoice_reference_fiscal_year TEXT,
  sales_document         TEXT,
  sales_document_item    TEXT,
  posting_date           TIMESTAMPTZ,
  document_date          TIMESTAMPTZ,
  assignment_reference   TEXT,
  gl_account             TEXT,
  financial_account_type TEXT,
  profit_center          TEXT,
  cost_center            TEXT,
  PRIMARY KEY (company_code, fiscal_year, accounting_document, accounting_document_item)
);
CREATE INDEX IF NOT EXISTS idx_par_customer ON payments_ar(customer);
CREATE INDEX IF NOT EXISTS idx_par_invoice ON payments_ar(invoice_reference);
