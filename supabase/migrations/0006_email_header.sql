-- The email header is now admin-editable too, alongside the footer, so this
-- singleton table holds both. Renamed from email_footer since it's no
-- longer just the footer.
alter table email_footer rename to email_layout;

alter table email_layout add column header_html text not null default
  '<span style="color:#ffffff; font-size:18px; font-weight:bold;">Tiny Store</span>';
