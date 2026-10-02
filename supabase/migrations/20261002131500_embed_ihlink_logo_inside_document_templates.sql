-- Keep the master IHLink identity inside the designed document/template area.
-- This removes the old detached logo strip from seeded invoices/receipts/certificates.

update public.ihlink_document_templates
set content = replace(
  replace(content,
    '<div style="text-align:center;padding:18px 0"><img src="{{logo_url}}" alt="IHLink" style="width:76px;height:76px;object-fit:contain"><div style="font-weight:800;color:#0f2f63;margin-top:8px">IHLink Co. Ltd.</div></div>',''),
  '<div><div style="font-size:12px;letter-spacing:.16em;opacity:.8">IHLink</div>',
  '<div><img src="{{logo_url}}" alt="IHLink" style="width:58px;height:58px;object-fit:contain;background:white;border-radius:12px;padding:4px;margin-bottom:8px"><div style="font-size:12px;letter-spacing:.16em;opacity:.8">IHLink Co. Ltd.</div>'
), updated_at=now()
where template_type='invoice' and content like '<div style="text-align:center;padding:18px 0%';

update public.ihlink_document_templates
set content = replace(
  replace(content,
    '<div style="text-align:center;padding:18px 0"><img src="{{logo_url}}" alt="IHLink" style="width:76px;height:76px;object-fit:contain"><div style="font-weight:800;color:#0f2f63;margin-top:8px">IHLink Co. Ltd.</div></div>',''),
  '<div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8">IHLink DataSub</div>',
  '<img src="{{logo_url}}" alt="IHLink" style="width:58px;height:58px;object-fit:contain;background:white;border-radius:12px;padding:4px;margin-bottom:10px"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8">IHLink DataSub</div>'
), updated_at=now()
where platform_code='datasub' and template_type='receipt';

update public.ihlink_document_templates
set content = replace(
  replace(content,
    '<div style="text-align:center;padding:18px 0"><img src="{{logo_url}}" alt="IHLink" style="width:76px;height:76px;object-fit:contain"><div style="font-weight:800;color:#0f2f63;margin-top:8px">IHLink Co. Ltd.</div></div>',''),
  '<div style="font-size:13px;letter-spacing:.28em;color:#0b4f91;font-weight:700">IHLINK ACADEMY</div>',
  '<img src="{{logo_url}}" alt="IHLink" style="width:82px;height:82px;object-fit:contain;margin:0 auto 14px"><div style="font-size:13px;letter-spacing:.28em;color:#0b4f91;font-weight:700">IHLINK ACADEMY</div>'
), updated_at=now()
where platform_code='academy' and template_type='certificate';

update public.ihlink_document_templates
set content='<div style="max-width:820px;margin:auto;background:white;border:1px solid #dbe4ee;border-radius:18px;overflow:hidden;font-family:Arial,sans-serif;color:#172033"><div style="background:#071a35;color:white;padding:28px 34px;display:flex;justify-content:space-between;align-items:flex-start"><div><img src="{{logo_url}}" alt="IHLink" style="width:58px;height:58px;object-fit:contain;background:white;border-radius:12px;padding:4px;margin-bottom:8px"><div style="font-size:12px;letter-spacing:.16em;opacity:.8">IHLink Co. Ltd.</div><h1 style="margin:6px 0 0;font-size:26px">SchoolPro</h1></div><div style="text-align:right"><div style="font-size:12px;opacity:.75">SUBSCRIPTION INVOICE</div><strong style="font-size:18px">{{invoice_number}}</strong></div></div><div style="padding:30px 34px"><p><b>School:</b> {{school_name}}</p><p><b>Plan:</b> {{plan_name}}</p><p><b>Status:</b> {{status}}</p><div style="margin-top:22px;border-top:2px solid #071a35;padding-top:16px;display:flex;justify-content:space-between;font-size:20px;font-weight:800"><span>Total</span><span>{{amount}}</span></div><p style="margin-top:26px;font-size:12px;color:#64748b">Retain the invoice number and verified settlement reference for IHLink SchoolPro subscription support.</p></div></div>',
updated_at=now()
where platform_code='schoolpro' and template_type='invoice' and name='SchoolPro Subscription Invoice';
