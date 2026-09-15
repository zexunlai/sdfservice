insert into public.glossary_sources(organisation,official_title,official_url,year_or_version) values
('UNFCCC','Rules and Regulations','https://unfccc.int/process-and-meetings/bodies/constituted-bodies/article-64-supervisory-body/rules-and-regulations',null),
('GHG Protocol','Standards & Guidance','https://ghgprotocol.org/standards-guidance',null),
('TNFD','Guidance on the identification and assessment of nature-related issues: the LEAP approach','https://tnfd.global/publication/additional-guidance-on-assessment-of-nature-related-issues-the-leap-approach/','v1.1'),
('ISO','ISO/TC 323 Circular economy','https://www.iso.org/committee/7203984.html',null),
('NASA Earthdata','Your Gateway to NASA Earth Observation Data','https://www.earthdata.nasa.gov/home',null);

with terms(canonical,en_term,zh_term,acronym,rule,avoid_zh,en_definition,zh_definition,source_org) as (values
('additionality','additionality','外加性',null,'must_use',array[]::text[],'A criterion for assessing whether a mitigation outcome depends on the incentive or conditions created by a crediting mechanism.','用於評估減緩成果是否依賴碳額度機制所創造之誘因或條件的判準。','UNFCCC'),
('baseline','baseline','基線',null,'preferred',array[]::text[],'A reference scenario or quantified level against which change or performance is assessed.','用來評估變化或績效的參考情境或量化水準。','UNFCCC'),
('leakage','leakage','洩漏',null,'preferred',array[]::text[],'An increase in emissions or environmental pressure outside an activity boundary that is linked to the activity.','因某項活動而在其邊界外產生的排放或環境壓力增加。','UNFCCC'),
('permanence','permanence','持久性',null,'preferred',array[]::text[],'The durability of an environmental outcome and its exposure to reversal over time.','環境成果能否長期維持，以及其隨時間發生逆轉的風險。','UNFCCC'),
('measurement, reporting and verification','measurement, reporting and verification','衡量、報告與查驗','MRV','keep_acronym',array[]::text[],'A system for quantifying results, documenting them and subjecting reported information to verification.','對成果進行量化、形成報告，並由查驗程序檢視所報資訊的制度。','UNFCCC'),
('carbon credit','carbon credit','碳權',null,'must_use',array['碳信用'],'A transferable unit representing a quantified climate mitigation outcome under a defined program or mechanism.','在特定計畫或機制下，代表量化氣候減緩成果且可移轉的單位。','UNFCCC'),
('biodiversity','biodiversity','生物多樣性',null,'must_use',array[]::text[],'The variety of life across genes, species and ecosystems, including the relationships among them.','涵蓋基因、物種與生態系層級，以及彼此關係的生命多樣性。','TNFD'),
('ecosystem services','ecosystem services','生態系服務',null,'preferred',array[]::text[],'Benefits and functions that people and economies receive from ecosystems.','人類與經濟活動從生態系獲得的效益與功能。','TNFD'),
('circular economy','circular economy','循環經濟',null,'must_use',array[]::text[],'An economic approach that retains value, reduces virgin resource demand and minimizes waste through system design.','透過系統設計維持價值、降低原生資源需求並減少廢棄物的經濟模式。','ISO'),
('geospatial intelligence','geospatial intelligence','地理空間情報','GEOINT','preferred',array[]::text[],'Decision-relevant insight derived by combining location, spatial relationships and geographic data.','結合位置、空間關係與地理資料所形成、可支援決策的洞見。','NASA Earthdata'),
('Taskforce on Nature-related Financial Disclosures','Taskforce on Nature-related Financial Disclosures','自然相關財務揭露工作小組','TNFD','keep_acronym',array[]::text[],'A market-led framework and guidance system for assessing and disclosing nature-related issues.','用於評估與揭露自然相關議題的市場導向框架與指引系統。','TNFD')
), inserted as (
insert into public.glossary_terms(canonical_english_term,preferred_english_term,preferred_chinese_term,acronym,avoid_chinese,translation_rule,status,public_definition_enabled,auto_reference_enabled,public_display_rule,definition_source_id,definition_type,last_reviewed_at)
select canonical,en_term,zh_term,acronym,avoid_zh,rule::public.translation_rule, 'approved'::public.glossary_status,true,true,'first_occurrence_only',gs.id,'ze_xun_lai',now()
from terms t left join public.glossary_sources gs on gs.organisation=t.source_org
on conflict(canonical_english_term) do update set preferred_english_term=excluded.preferred_english_term,preferred_chinese_term=excluded.preferred_chinese_term,acronym=excluded.acronym,avoid_chinese=excluded.avoid_chinese,translation_rule=excluded.translation_rule,status='approved',public_definition_enabled=true,auto_reference_enabled=true,definition_source_id=excluded.definition_source_id,last_reviewed_at=now()
returning id,canonical_english_term
)
insert into public.glossary_term_translations(glossary_term_id,locale,display_term,definition,translation_status,translator_name,translation_credit_public,reviewed_at)
select i.id,'en',t.en_term,t.en_definition,'original','Ze-Xun Lai',false,now() from inserted i join terms t on t.canonical=i.canonical_english_term
union all
select i.id,'zh-TW',t.zh_term,t.zh_definition,'human_translated','Ze-Xun Lai',true,now() from inserted i join terms t on t.canonical=i.canonical_english_term
on conflict(glossary_term_id,locale) do update set display_term=excluded.display_term,definition=excluded.definition,translation_status=excluded.translation_status,translator_name=excluded.translator_name,reviewed_at=excluded.reviewed_at;

insert into public.glossary_variants(glossary_term_id,locale,variant,variant_kind,case_sensitive)
select id,'en',acronym,'acronym',true from public.glossary_terms where acronym is not null
on conflict do nothing;
insert into public.glossary_variants(glossary_term_id,locale,variant,variant_kind,case_sensitive)
select id,'zh-TW',unnest(avoid_chinese),'avoid',false from public.glossary_terms where cardinality(avoid_chinese)>0
on conflict do nothing;
