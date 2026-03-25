// ===== CommGen AI — Stellantis Communication Generator =====

document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initTabs();
});

// ===== FILE UPLOAD =====
function initUpload() {
    const fileSpec = document.getElementById('file-spec');
    const fileTemplate = document.getElementById('file-template');
    const btnAnalyze = document.getElementById('btn-analyze');
    let specReady = false, templateReady = false;

    fileSpec.addEventListener('change', () => {
        if (fileSpec.files.length) {
            specReady = true;
            document.getElementById('upload-spec').classList.add('uploaded');
            document.getElementById('status-spec').textContent = '✓ ' + fileSpec.files[0].name;
            document.getElementById('status-spec').className = 'upload-status success';
            checkReady();
        }
    });

    fileTemplate.addEventListener('change', () => {
        if (fileTemplate.files.length) {
            templateReady = true;
            document.getElementById('upload-template').classList.add('uploaded');
            document.getElementById('status-template').textContent = '✓ ' + fileTemplate.files[0].name;
            document.getElementById('status-template').className = 'upload-status success';
            checkReady();
        }
    });

    function checkReady() {
        btnAnalyze.disabled = !(specReady && templateReady);
    }

    btnAnalyze.addEventListener('click', () => {
        showStep('step-analysis');
        runAnalysis();
    });

    document.getElementById('btn-generate').addEventListener('click', () => {
        showStep('step-dashboard');
        renderAllOutputs();
    });

    // Also allow demo mode — click analyze without files for demo
    btnAnalyze.addEventListener('dblclick', () => {
        specReady = true; templateReady = true;
        document.getElementById('upload-spec').classList.add('uploaded');
        document.getElementById('status-spec').textContent = '✓ CAP-37495_PNR 10279_DFS_AllureCare_V4.0.docx';
        document.getElementById('status-spec').className = 'upload-status success';
        document.getElementById('upload-template').classList.add('uploaded');
        document.getElementById('status-template').textContent = '✓ Basket 7.20_Communication_EN.docx';
        document.getElementById('status-template').className = 'upload-status success';
        btnAnalyze.disabled = false;
    });
}

function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active-step'));
    document.getElementById(id).classList.add('active-step');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== ANALYSIS ANIMATION =====
function runAnalysis() {
    const steps = [
        { id: 'prog-parse', delay: 800 },
        { id: 'prog-template', delay: 1200 },
        { id: 'prog-extract', delay: 1500 },
        { id: 'prog-acronym', delay: 1000 },
        { id: 'prog-validate', delay: 1000 },
    ];

    let cumDelay = 0;
    steps.forEach((step, i) => {
        const el = document.getElementById(step.id);
        setTimeout(() => {
            el.querySelector('.prog-icon').className = 'prog-icon running';
            el.querySelector('.prog-fill').style.width = '60%';
        }, cumDelay);

        cumDelay += step.delay;
        const finishDelay = cumDelay;
        setTimeout(() => {
            el.querySelector('.prog-icon').className = 'prog-icon done';
            el.querySelector('.prog-fill').style.width = '100%';
            el.classList.add('done');
        }, finishDelay);
    });

    setTimeout(() => {
        document.getElementById('detection-card').style.display = 'block';
        document.getElementById('analysis-actions').style.display = 'flex';
    }, cumDelay + 400);
}

// ===== TABS =====
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        });
    });
}

// ===== RENDER ALL OUTPUTS =====
function renderAllOutputs() {
    renderCommunication();
    renderValidation();
    renderAcronyms();
    renderTestPlan();
    renderKnowHow();
    initExportButtons();
}

// ===== GENERATED COMMUNICATION (Strict Template Mode) =====
function renderCommunication() {
    document.getElementById('comm-output').innerHTML = `
<div class="comm-header-block">
    <p><strong>COUNTRY NOTE</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Poissy, March 25th, 2026</p>
    <p><strong>SENDER</strong></p>
    <p>From: AFFI/PS/TS/NSS</p>
    <p><strong>RECEIVER(S)</strong></p>
    <p>All subsidiaries and importers</p>
    <p><strong>REF:</strong> CAP-37495 / PNR-10279</p>
    <p><strong>Subject:</strong> Service Box – Basket, Allure Care Program (BrandCare) Integration</p>
</div>

<h4>Important Information and Key Points of the Note</h4>
<p><strong>Evolutions</strong></p>
<ul>
    <li>Allure Care Program (BrandCare): Full integration of the 8-Year Warranty Programme activation process within PANIER (Service Box Basket).</li>
</ul>

<p>Hello,</p>
<p>We have introduced a major Enhancement in this new release of the Basket application of Service Box to support the Allure Care Program (BrandCare).</p>
<p>The major points are highlighted below.</p>
<p>Kindly note that these improvements will be available starting at noon on <strong>[Deployment Date TBD]</strong>.</p>

<h4>Evolutions</h4>
<p>The Allure Care Program — part of the 8-Year Warranty Programme (Peugeot Care, Citroën We Care, DS Serenity, Opel 8Y Warranty) — is now fully integrated into PANIER (Service Box Basket). This evolution enables Authorised Repairers (ARs) to manage BrandCare eligibility checks, create dedicated service worklines, and transfer workline data to BrandCare Forms (DMBR) directly from the Basket application.</p>

<p>Starting from deployment, the following capabilities will be available in Service Box for eligible vehicles:</p>
<ul>
    <li><strong>VIN Eligibility Check:</strong> PANIER will automatically request VIN eligibility from HUB when a VIN is searched, a folder is created/opened, or the VIN is changed. HUB will return eligibility status including contribution flag, engine type (BEV/NON-BEV), and vehicle type (PC/LCV).</li>
    <li><strong>BrandCare Contract Display:</strong> If BrandCare contract information is received from SAGAI, it will be displayed on the Vehicle Landing page, Customer Vehicle page, and Synthesis page alongside other warranty contracts.</li>
    <li><strong>BrandCare Workline Creation:</strong> ARs can create BrandCare service worklines using designated systematic operation codes (e.g. 93830000, 95R48A) in the Workline Code field on the Repair Order screen. Workline Allocation Type must be set to "Manufacturer".</li>
    <li><strong>BrandCare Checkbox on DMS Transfer Screen:</strong> A new "BrandCare" column with a checkbox will appear on the DMS Transfer screen for worklines meeting all eligibility criteria:
        <ul>
            <li>VIN eligibility status received from HUB (Eligibility Status = 1)</li>
            <li>Characteristic 'CARE_PROGRAM' assigned to the dealer RRDI of the vehicle Reception brand</li>
            <li>Reception brand is the same as VIN brand</li>
            <li>Logged-in user has the BrandCare service applicative assigned</li>
            <li>Workline has a designated BrandCare systematic operation code</li>
            <li>Workline Allocation Type is "Manufacturer"</li>
        </ul>
    </li>
    <li><strong>Transfer to BrandCare Forms:</strong> A new button "Transfer to 8 years Warranty program" will appear on the DMS Transfer Results page. On click, PANIER sends workline, folder details, and vehicle information to BrandCare Forms (DMBR) via JWT token (OAuth 2.0 / Ping Federate), opening the form in a new browser tab.</li>
</ul>

<p>This evolution is applicable for the following Job Roles: Aftersales Manager, Service Advisor, Warranty Specialist, Service Reception Coordinator.</p>

<p>A new characteristic "CARE_PROGRAM" will be available in My Dealership for eligible dealers.</p>

<div class="training-box">
    <strong>Training:</strong> A Virtual Class Training dedicated to the dealer journey will be activated for G10 countries.
    <ul>
        <li>FR: <em>Link to be communicated</em></li>
        <li>Other countries: To be communicated shortly</li>
    </ul>
</div>

<div class="highlight-box">
    Important: The training must be completed before submitting the BrandCare forms in order to secure the activation of the 8-year warranty coverage and avoid any processing issues. The workline must be successfully transferred to DMS before it can be transferred to BrandCare Forms.
</div>

<h4>Key Messages &amp; Warnings</h4>
<ul>
    <li>If the Reception Brand differs from the VIN brand, the following message will be displayed: <em>"Reception Brand is different from the VIN brand, workline cannot be transferred to 8 years Warranty program."</em></li>
    <li>If mandatory parameters required for BrandCare transfer are missing, the BrandCare checkbox will be visible but greyed out, with an explanatory orange-bar message on the DMS Transfer page.</li>
    <li>If DMS Transfer is not successful, the "Transfer to 8 years Warranty program" button will be greyed out with a tooltip: <em>"Workline cannot be transferred to 8 years Warranty program as the transfer to DMS is not successful."</em></li>
    <li>This evolution is applicable only for G10 countries. HUB maintains the list of eligible G10 countries.</li>
    <li>Only Peugeot and Citroën vehicles are in scope for now. DS and Opel will follow in future releases.</li>
    <li>All LCV vehicles are currently out of scope.</li>
</ul>

<h4>Deployment Information</h4>
<ul>
    <li><strong>Application:</strong> Service Box – PANIER (Basket)</li>
    <li><strong>Scope:</strong> G10 EU markets — Peugeot &amp; Citroën brands</li>
    <li><strong>Availability:</strong> From <strong>[Deployment Date TBD]</strong> at noon</li>
    <li><strong>Integrated Systems:</strong> HUB, DMBR (BrandCare Forms), BRR, CEM/SAGAI, CIN</li>
    <li><strong>Authentication:</strong> Ping Federate IDP OAuth 2.0 token (APIC URL)</li>
    <li><strong>Browsers:</strong> Stellantis-approved versions of Edge and Chrome</li>
</ul>

<p>Thank you for your attention and cooperation in ensuring a smooth implementation. Should you have any questions, please do not hesitate to reach out.</p>
`;
}

// ===== VALIDATION REPORT =====
function renderValidation() {
    document.getElementById('validation-output').innerHTML = `
<h4>Structure Alignment with Template</h4>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Header (Sender, Receiver, Subject, Date):</strong> Present and aligned with Basket 7.20 Communication template format.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Context / Introduction:</strong> Present — includes greeting, summary of changes, and deployment date placeholder.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Evolutions Section:</strong> Present — covers all key features from DFS (VIN eligibility, workline creation, DMS transfer, BrandCare transfer).</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Deployment Information:</strong> Present — includes application, scope, availability, integrated systems.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Important Instructions (Training, Warnings):</strong> Present — training box and highlight box included.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Bug Fixes Table:</strong> Not applicable — DFS does not contain bug fix items. Section intentionally omitted. If bug fixes exist for this release, they must be added manually.</div></div>

<h4>Completeness vs Specification</h4>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-01:</strong> xPSA AR-only scope correctly stated.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-02:</strong> CARE_PROGRAM characteristic and service applicative requirements covered.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-03 / BR-04:</strong> VIN eligibility flow with HUB described, including all trigger scenarios (search, new folder, open folder, change VIN, external app).</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-05:</strong> SAGAI contract display on Vehicle Landing, Customer Vehicle, Synthesis pages mentioned.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-06:</strong> Systematic operation codes and workline creation process documented.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-07:</strong> All 6 eligibility criteria for BrandCare checkbox listed.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-08:</strong> Transfer to BrandCare button, JWT token, DMBR redirection covered.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-09:</strong> New tab redirection to DMBR covered.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>BR-04 FR-03 (Engine/Vehicle Type):</strong> Mentioned in communication (BEV/NON-BEV, PC/LCV) but low detail. Consider adding explicit description of how these parameters are used downstream.</div></div>

<h4>Naming Consistency</h4>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>"8 years Warranty program":</strong> Used consistently per DFS V4.0 update (changed from "Care Program" in V4.0 revision).</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>"BrandCare" vs "Allure Care Program":</strong> Both terms used in the communication. DFS uses "BrandCare" as the umbrella term and "AllureCare" for Peugeot specifically. Recommend adding a clarifying sentence for dealers.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>"Care Program" vs "8 years Warranty program" in button labels:</strong> DFS references button text as "Transfer to Care Program" in some places and "Transfer to 8 years Warranty program" in others (V4.0 update). Communication uses the V4.0 version consistently, but dealers may encounter residual "Care Program" labels.</div></div>

<h4>Risks &amp; Ambiguities</h4>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Deployment Date:</strong> Not specified in the DFS. Marked as [TBD] in the communication. Must be confirmed before distribution.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Training URL:</strong> Only the FR training link pattern was available in the template. Other country links marked as "To be communicated."</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Importers:</strong> Explicitly out of scope in DFS, but the Basket Communication template sends to "All subsidiaries and importers." Should the communication clarify importers are excluded?</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>LCV Exclusion:</strong> Clearly stated in the communication as out of scope.</div></div>

<h4>Recommendations</h4>
<div class="val-item"><div class="val-icon val-warn"></div><div>Add a glossary section or footnote to the communication explaining BrandCare, AllureCare, and 8-Year Warranty Programme terminology for clarity at dealer level.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div>Confirm the exact deployment date and update the [TBD] placeholder before sending.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div>Add a note that DS and Opel brands will be supported in a future release to set expectations.</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div>Overall communication quality is aligned with the Basket 7.20 template: tone is corporate, operational, and clear. Structure matches the reference document.</div></div>
`;
}

// ===== ACRONYM TABLE =====
function renderAcronyms() {
    const acronyms = [
        { acr: 'AR', source: 'Spec + Comm', def: 'Authorised Repairers', status: 'ok', note: 'Defined in glossary' },
        { acr: 'PANIER', source: 'Spec + Comm', def: 'Application used for parts purchase and vehicle servicing (Basket)', status: 'ok', note: 'Defined in glossary' },
        { acr: 'VIN', source: 'Spec + Comm', def: 'Vehicle Identification Number', status: 'ok', note: 'Industry standard' },
        { acr: 'HUB', source: 'Spec + Comm', def: 'Central integration platform for eligibility routing', status: 'ok', note: 'Used in DFS context' },
        { acr: 'DMBR', source: 'Spec + Comm', def: 'Application hosting BrandCare Forms', status: 'ok', note: 'Defined in DFS' },
        { acr: 'DMS', source: 'Spec + Comm', def: 'Dealer Management System', status: 'ok', note: 'Industry standard' },
        { acr: 'BRR', source: 'Spec', def: 'Business Rules Repository (characteristics management)', status: 'ok', note: 'Referenced in integration section' },
        { acr: 'CEM', source: 'Spec', def: 'Contract and Eligibility Management', status: 'warn', note: 'Not explicitly defined in DFS glossary — inferred from context' },
        { acr: 'SAGAI', source: 'Spec + Comm', def: 'Warranty contract information system', status: 'warn', note: 'Not explicitly defined in DFS glossary — inferred from context' },
        { acr: 'CIN', source: 'Spec', def: 'Vehicle identification system (VIN/VIS resolution)', status: 'warn', note: 'Not explicitly defined in DFS glossary' },
        { acr: 'SCF', source: 'Spec', def: 'BrandCare Forms (=SC Forms)', status: 'ok', note: 'Defined in glossary as "BrandCare Forms hosted by DMBR"' },
        { acr: 'SC', source: 'Spec', def: 'BrandCare', status: 'ok', note: 'Defined in glossary' },
        { acr: 'SA', source: 'Spec', def: 'Service Applicative', status: 'ok', note: 'Defined in glossary' },
        { acr: 'FDZ', source: 'Spec + Comm', def: 'Technical documentation (Fiche de Zone)', status: 'ok', note: 'Defined in glossary' },
        { acr: 'SBMB', source: 'Spec', def: 'Service Box Multi-Brand application', status: 'ok', note: 'Defined in glossary' },
        { acr: 'xP / xPSA', source: 'Spec', def: 'PSA vehicles (AP, AC, OV, DS, CT)', status: 'ok', note: 'Defined in glossary' },
        { acr: 'AP', source: 'Spec', def: 'Peugeot vehicles', status: 'ok', note: 'Defined in glossary' },
        { acr: 'BEV', source: 'Spec + Comm', def: 'Battery Electric Vehicle', status: 'ok', note: 'Industry standard' },
        { acr: 'LCV', source: 'Spec + Comm', def: 'Light Commercial Vehicle', status: 'ok', note: 'Industry standard' },
        { acr: 'JWT', source: 'Comm', def: 'JSON Web Token', status: 'ok', note: 'Industry standard, used for PANIER-DMBR auth' },
        { acr: 'RRDI', source: 'Spec + Comm', def: 'Dealer identification code', status: 'warn', note: 'Used frequently but not in glossary — needs formal definition' },
        { acr: 'CORVET', source: 'Spec', def: 'Vehicle technical data system', status: 'warn', note: 'Referenced once, not in glossary' },
        { acr: 'VIS', source: 'Spec', def: 'Vehicle Identification Short (partial VIN)', status: 'warn', note: 'Not in glossary — inferred from context' },
        { acr: 'DGC', source: 'Spec', def: 'Diagnostic process flow', status: 'warn', note: 'Not in glossary — referenced as "standard warranty process"' },
        { acr: '8YW', source: 'Comm (template)', def: '8-Year Warranty', status: 'ok', note: 'Used in Basket 7.20 template as icon label' },
        { acr: 'ERCS', source: 'Spec', def: 'External Repairer Connection System', status: 'warn', note: 'Not in glossary — inferred' },
        { acr: 'POI', source: 'Spec', def: 'Point of Interest / External portal', status: 'warn', note: 'Not in glossary' },
    ];

    const statusLabel = { ok: 'Defined', warn: 'Undefined', error: 'Inconsistent' };
    const statusClass = { ok: 'acr-ok', warn: 'acr-warn', error: 'acr-error' };

    let html = `<table><thead><tr><th>Acronym</th><th>Source</th><th>Definition</th><th>Status</th><th>Note</th></tr></thead><tbody>`;
    acronyms.forEach(a => {
        html += `<tr>
            <td><strong>${a.acr}</strong></td>
            <td>${a.source}</td>
            <td>${a.def}</td>
            <td><span class="acr-status ${statusClass[a.status]}">${statusLabel[a.status]}</span></td>
            <td>${a.note}</td>
        </tr>`;
    });
    html += `</tbody></table>`;

    const summary = acronyms.filter(a => a.status !== 'ok').length;
    html = `<p style="margin-bottom:16px;font-size:.9rem;"><strong>${acronyms.length}</strong> acronyms detected across spec and communication. <strong>${summary}</strong> require attention (undefined or missing from glossary).</p>` + html;

    document.getElementById('acronyms-output').innerHTML = html;
}

// ===== TEST PLAN =====
function renderTestPlan() {
    const tests = [
        {
            id: 'TC-BC-001', desc: 'VIN eligibility — Search eligible VIN via HUB bar',
            pre: 'User logged in as AR with SA assigned; CARE_PROGRAM characteristic set; VIN is BrandCare-eligible in HUB',
            steps: '1. Navigate to PANIER\n2. Enter eligible VIN in HUB search bar\n3. Click Search',
            expected: 'Vehicle Landing page opens. BrandCare warranty contracts displayed in contract section (if received from SAGAI). Eligibility status stored for downstream checks.'
        },
        {
            id: 'TC-BC-002', desc: 'VIN eligibility — Create new folder with eligible VIN',
            pre: 'Same as TC-BC-001',
            steps: '1. Click New Folder\n2. Enter eligible VIN\n3. Click Save',
            expected: 'Customer-Vehicle page updated with VIN info. BrandCare contracts displayed. HUB eligibility status = 1.'
        },
        {
            id: 'TC-BC-003', desc: 'VIN eligibility — Change VIN in existing folder',
            pre: 'Existing folder open with a non-eligible VIN. New VIN is eligible.',
            steps: '1. Open existing folder\n2. Change VIN to eligible VIN\n3. Click Save',
            expected: 'Customer-Vehicle page refreshed. New VIN eligibility fetched from HUB. BrandCare contracts displayed if available from SAGAI.'
        },
        {
            id: 'TC-BC-004', desc: 'VIN eligibility — Non-eligible VIN (Level 1/Level 2 fail)',
            pre: 'VIN does not meet Level 1 or Level 2 criteria in HUB',
            steps: '1. Enter non-eligible VIN\n2. Click Search/Save',
            expected: 'Vehicle page opens without BrandCare contract data. No BrandCare icon or programme name displayed.'
        },
        {
            id: 'TC-BC-005', desc: 'VIN eligibility — Landing from external app (FDZ, SBMB, TyreCatalog, MenuPricing)',
            pre: 'User navigates from external app with eligible VIN context',
            steps: '1. From external app, click basket icon with eligible VIN',
            expected: 'Part/Labor details displayed on Work Details/Order screen. BrandCare contracts displayed. Eligibility fetched from HUB.'
        },
        {
            id: 'TC-BC-006', desc: 'VIN eligibility — VIS entered instead of VIN',
            pre: 'User creates folder with VIS (partial VIN)',
            steps: '1. Create folder with VIS\n2. Save',
            expected: 'PANIER resolves VIS to VIN via CIN/CORVET. Sends resolved VIN to HUB for eligibility check.'
        },
        {
            id: 'TC-BC-007', desc: 'Workline creation — Designated BrandCare systematic operation code',
            pre: 'Folder with eligible VIN exists. AR on Repair Order screen.',
            steps: '1. Add standard workline\n2. Enter designated SC code (e.g. 93830000) in Workline Code\n3. Set Allocation Type = Manufacturer\n4. Click Save',
            expected: 'Workline created successfully for BrandCare service.'
        },
        {
            id: 'TC-BC-008', desc: 'Workline creation — Non-designated code entered',
            pre: 'Folder with eligible VIN. AR on Repair Order screen.',
            steps: '1. Add workline with non-BrandCare code\n2. Set Allocation Type = Manufacturer\n3. Save',
            expected: 'Workline created. No BrandCare checkbox on DMS Transfer screen for this workline.'
        },
        {
            id: 'TC-BC-009', desc: 'Workline creation — Fixed price package from FDZ/MenuPricing with SC code',
            pre: 'Folder with eligible VIN. Package from FDZ has designated SC code.',
            steps: '1. Add fixed price package from FDZ\n2. Allocation Type = Manufacturer',
            expected: 'Workline created for BrandCare with auto-populated SC code.'
        },
        {
            id: 'TC-BC-010', desc: 'DMS Transfer — BrandCare checkbox displayed (all criteria met)',
            pre: 'VIN eligible (HUB status=1); CARE_PROGRAM assigned; SA assigned; SC code in workline; Allocation=Manufacturer; Reception brand = VIN brand',
            steps: '1. Navigate through Work Detail > Pricing > Order\n2. Arrive at DMS Transfer screen',
            expected: 'BrandCare column visible. Checkbox enabled for the eligible workline.'
        },
        {
            id: 'TC-BC-011', desc: 'DMS Transfer — Checkbox NOT displayed: VIN not eligible',
            pre: 'VIN eligibility status ≠ 1 from HUB. All other conditions met.',
            steps: '1. Create workline with SC code\n2. Navigate to DMS Transfer screen',
            expected: 'BrandCare column NOT displayed for the workline.'
        },
        {
            id: 'TC-BC-012', desc: 'DMS Transfer — Checkbox NOT displayed: CARE_PROGRAM not assigned',
            pre: 'VIN eligible but CARE_PROGRAM characteristic not assigned to dealer RRDI of Reception brand',
            steps: '1. Create eligible workline\n2. Navigate to DMS Transfer',
            expected: 'BrandCare column NOT displayed.'
        },
        {
            id: 'TC-BC-013', desc: 'DMS Transfer — Checkbox NOT displayed: SA not assigned to user',
            pre: 'VIN eligible, CARE_PROGRAM assigned, but logged-in user lacks BrandCare SA',
            steps: '1. Create eligible workline\n2. Navigate to DMS Transfer',
            expected: 'BrandCare column NOT displayed.'
        },
        {
            id: 'TC-BC-014', desc: 'DMS Transfer — Checkbox NOT displayed: Allocation type is Internal/Customer',
            pre: 'VIN eligible, all conditions met except Allocation Type = Customer or Internal',
            steps: '1. Create workline with SC code, Allocation = Customer\n2. Navigate to DMS Transfer',
            expected: 'BrandCare column NOT displayed for that workline.'
        },
        {
            id: 'TC-BC-015', desc: 'DMS Transfer — Reception brand differs from VIN brand (AGENDA folder)',
            pre: 'Folder created in AGENDA with preset Reception brand. VIN is eligible but of different brand.',
            steps: '1. Navigate to PANIER from AGENDA\n2. Enter BC-eligible VIN of different brand\n3. Save',
            expected: 'Warning message: "Reception Brand is different from the VIN brand, workline cannot be transferred to 8 years Warranty program." BrandCare checkbox NOT shown on DMS Transfer.'
        },
        {
            id: 'TC-BC-016', desc: 'DMS Transfer — AR changes Reception brand to different brand',
            pre: 'Folder with eligible VIN. Reception brand initially = VIN brand.',
            steps: '1. Change Reception brand to a different brand\n2. Save',
            expected: 'Warning message displayed on current screen. BrandCare checkbox NOT shown on DMS Transfer.'
        },
        {
            id: 'TC-BC-017', desc: 'DMS Transfer — Mandatory parameters missing (checkbox greyed out)',
            pre: 'All eligibility criteria met but mandatory transfer parameters incomplete',
            steps: '1. Navigate to DMS Transfer screen',
            expected: 'BrandCare checkbox visible but greyed out/disabled. Orange-bar message indicating missing parameter.'
        },
        {
            id: 'TC-BC-018', desc: 'Transfer to BrandCare — Successful DMS transfer then BCF transfer',
            pre: 'All criteria met. Workline ready on DMS Transfer screen.',
            steps: '1. Select BrandCare checkbox\n2. Click Transfer/Transfer & Keep\n3. DMS transfer succeeds\n4. Click "Transfer to 8 years Warranty program" button',
            expected: 'Workline + folder data sent to DMBR via JWT. BrandCare Form opens in new browser tab.'
        },
        {
            id: 'TC-BC-019', desc: 'Transfer to BrandCare — DMS transfer fails',
            pre: 'All criteria met. DMS transfer encounters technical failure.',
            steps: '1. Select BrandCare checkbox\n2. Click Transfer\n3. DMS transfer fails',
            expected: '"Transfer to 8 years Warranty program" button greyed out. Tooltip: "Workline cannot be transferred to 8 years Warranty program as the transfer to DMS is not successful."'
        },
        {
            id: 'TC-BC-020', desc: 'Transfer to BrandCare — Mandatory parameters missing on results page',
            pre: 'DMS transfer successful but mandatory BCF parameters missing',
            steps: '1. Arrive at DMS Transfer Results page',
            expected: 'Orange bar message: "[XXXX] parameter is missing, workline cannot be transferred to CARE PROGRAM." Button greyed out.'
        },
        {
            id: 'TC-BC-021', desc: 'Transfer to BrandCare — Multiple worklines, partial transfer (Keep)',
            pre: 'Two BrandCare worklines in folder. AR selects Keep for one.',
            steps: '1. Select both BrandCare checkboxes\n2. Click Transfer & Keep for first workline\n3. Transfer first to BCF\n4. Return, transfer second workline to DMS\n5. Transfer second to BCF',
            expected: 'First workline transferred to BCF. Second workline available for BCF transfer after its DMS transfer succeeds.'
        },
        {
            id: 'TC-BC-022', desc: 'Integration — HUB returns no eligibility status',
            pre: 'HUB does not respond or returns empty eligibility',
            steps: '1. Enter VIN\n2. Search/Save',
            expected: 'VIN treated as ineligible. No BrandCare features activated.'
        },
        {
            id: 'TC-BC-023', desc: 'Integration — SAGAI unavailable',
            pre: 'SAGAI service is down',
            steps: '1. Open folder with eligible VIN',
            expected: 'Message "SAGAI not available" displayed per existing process. BrandCare contract section empty.'
        },
        {
            id: 'TC-BC-024', desc: 'Security — JWT token authentication for PANIER to DMBR',
            pre: 'OAuth 2.0 Ping Federate configured',
            steps: '1. Click Transfer to 8 years Warranty program\n2. Monitor network request',
            expected: 'JWT token included in request header. Token contains iss, iat, locale, vinRRDI. Authentication successful via APIC URL.'
        },
        {
            id: 'TC-BC-025', desc: 'Scope — Independent Repairer (ERCS/POI/FIBAG/TME/EPER) access denied',
            pre: 'User logged in as Independent Repairer from external application',
            steps: '1. Navigate to PANIER with eligible VIN',
            expected: 'BrandCare functionalities not available. No BrandCare column, no transfer button.'
        },
    ];

    let html = `<table><thead><tr><th style="width:100px">Test ID</th><th style="width:220px">Description</th><th>Preconditions</th><th>Steps</th><th>Expected Result</th></tr></thead><tbody>`;
    tests.forEach(t => {
        html += `<tr>
            <td class="tp-id">${t.id}</td>
            <td>${t.desc}</td>
            <td>${t.pre}</td>
            <td>${t.steps.replace(/\n/g, '<br>')}</td>
            <td>${t.expected}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    html = `<p style="margin-bottom:16px;font-size:.9rem;"><strong>${tests.length}</strong> test cases generated from DFS CAP-37495 / PNR-10279 AllureCare V4.0 covering functional scenarios, eligibility logic, edge cases, UI behavior, and integration tests.</p>` + html;
    document.getElementById('testplan-output').innerHTML = html;
}

// ===== KNOW-HOW DOCUMENTATION =====
function renderKnowHow() {
    document.getElementById('knowhow-output').innerHTML = `
<h4>1. Business Context</h4>
<div class="kh-card">
    <h5>Allure Care Program (BrandCare)</h5>
    <p>ALLURE CARE PROGRAM is a Warranty Extension program launched in February 2024 to achieve improvement goals in B2C, B2B, NSCs, and Network markets for Peugeot Cars. Initially launched for Peugeot brand in G10 EU markets, it will extend to Citroën, Opel, and DS with different programme names. All programmes together are termed <strong>BrandCare</strong> by Stellantis.</p>
    <ul>
        <li><strong>Peugeot:</strong> Peugeot Care (Allure Care)</li>
        <li><strong>Citroën:</strong> Citroën We Care</li>
        <li><strong>DS:</strong> DS Serenity</li>
        <li><strong>Opel:</strong> Opel 8Y Warranty</li>
    </ul>
</div>

<h4>2. Eligibility Rules</h4>
<div class="kh-card">
    <h5>VIN Eligibility (HUB Check)</h5>
    <ul>
        <li>PANIER sends all VINs to HUB for BrandCare eligibility check</li>
        <li>HUB performs Level 1 and Level 2 eligibility checks</li>
        <li>Eligibility Status = 1 → VIN is eligible (both levels passed)</li>
        <li>If no status is received → VIN is considered ineligible</li>
        <li>For eligible VINs, HUB also returns: Contribution Flag (boolean), Engine Type (BEV/NON-BEV), Vehicle Type (PC/LCV)</li>
    </ul>
</div>
<div class="kh-card">
    <h5>Workline Transfer Eligibility (6 Conditions)</h5>
    <p>A workline can only be transferred to BrandCare Forms if ALL of the following are satisfied:</p>
    <ul>
        <li><strong>1.</strong> VIN eligibility status received from HUB (Status = 1)</li>
        <li><strong>2.</strong> Characteristic 'CARE_PROGRAM' assigned to dealer RRDI of vehicle Reception brand</li>
        <li><strong>3.</strong> Reception brand = VIN brand (for multibrand dealers)</li>
        <li><strong>4.</strong> Logged-in user has BrandCare Service Applicative (SA) assigned</li>
        <li><strong>5.</strong> Workline Code contains a designated BrandCare systematic operation code</li>
        <li><strong>6.</strong> Workline Allocation Type = "Manufacturer"</li>
    </ul>
</div>

<h4>3. Key Workflows</h4>
<div class="kh-card">
    <h5>VIN Check Flow</h5>
    <ul>
        <li><strong>Trigger:</strong> VIN search, new folder, open folder, change VIN, or landing from external app</li>
        <li><strong>Process:</strong> PANIER → HUB (send VIN) → HUB responds with eligibility status + contribution flag + engine/vehicle type</li>
        <li><strong>VIS handling:</strong> If VIS entered, PANIER resolves to VIN via CIN/CORVET first, then sends VIN to HUB</li>
        <li><strong>Display:</strong> If eligible and SAGAI returns contract info, display on Vehicle Landing, Customer Vehicle, and Synthesis pages</li>
    </ul>
</div>
<div class="kh-card">
    <h5>Workline Creation Flow</h5>
    <ul>
        <li>AR creates standard workline on Repair Order screen</li>
        <li>Enters designated systematic operation code (e.g. 93830000, 95R48A) in Workline Code field</li>
        <li>Or adds fixed-price package from FDZ/MenuPricing with SC codes</li>
        <li>Sets Allocation Type to "Manufacturer"</li>
        <li>No new workline type needed — uses existing standard types</li>
        <li>PANIER checks workline code against property file of BrandCare-eligible codes</li>
    </ul>
</div>
<div class="kh-card">
    <h5>Transfer to BrandCare Flow</h5>
    <ul>
        <li><strong>Step 1:</strong> AR selects BrandCare checkbox on DMS Transfer screen</li>
        <li><strong>Step 2:</strong> AR clicks Transfer / Transfer & Keep → DMS transfer executes</li>
        <li><strong>Step 3:</strong> On DMS Transfer Results page, "Transfer to 8 years Warranty program" button appears (active if DMS transfer successful + all mandatory params present)</li>
        <li><strong>Step 4:</strong> AR clicks button → PANIER sends workline + folder details to DMBR via JWT (OAuth 2.0 / Ping Federate)</li>
        <li><strong>Step 5:</strong> BrandCare Form opens in a new browser tab</li>
    </ul>
</div>

<h4>4. System Interactions</h4>
<div class="kh-card">
    <h5>Integration Map</h5>
    <ul>
        <li><strong>PANIER ↔ HUB:</strong> VIN eligibility request/response (send VIN, receive eligibility status, contribution flag, engine type, vehicle type)</li>
        <li><strong>PANIER → DMBR:</strong> Push workline + folder details to BrandCare Forms via JWT (OAuth 2.0, APIC URL). Parameters include locale, vinRRDI, contribution flag, language, folder DMS ID</li>
        <li><strong>PANIER ↔ BRR:</strong> Pull dealer characteristic info (CARE_PROGRAM) via existing PDVINFO service. Get latest labour rates before sending to SCF</li>
        <li><strong>PANIER ← CEM/SAGAI:</strong> Receive contract information flag (no interface changes)</li>
        <li><strong>PANIER ↔ CIN:</strong> No changes — existing VIN/VIS resolution</li>
    </ul>
</div>

<h4>5. Scope Boundaries</h4>
<div class="kh-card">
    <h5>In Scope</h5>
    <ul>
        <li>Peugeot and Citroën vehicles only (DS and Opel in future)</li>
        <li>G10 EU countries only (HUB maintains country list)</li>
        <li>xPSA Authorised Repairers only (not Independent Repairers)</li>
        <li>PC vehicles only (LCV excluded)</li>
    </ul>
    <h5>Out of Scope</h5>
    <ul>
        <li>VIN eligibility determination logic (handled by HUB)</li>
        <li>Historical maintenance data alerts</li>
        <li>Customer email mandatory enforcement</li>
        <li>xF ARs coming from POI</li>
        <li>Importers</li>
        <li>Labour/component exclusion rules (handled in BrandCare business docs)</li>
        <li>Mileage requirements and vehicle exclusion criteria management</li>
    </ul>
</div>

<h4>6. Error Messages Reference</h4>
<div class="kh-card">
    <h5>User-Facing Messages</h5>
    <ul>
        <li><strong>Brand mismatch:</strong> "Reception Brand is different from the VIN brand, workline cannot be transferred to 8 years Warranty program"</li>
        <li><strong>DMS transfer failed:</strong> "Workline cannot be transferred to 8 years Warranty program as the transfer to DMS is not successful" (tooltip)</li>
        <li><strong>Missing parameter:</strong> "[XXXX] parameter is missing, workline cannot be transferred to CARE PROGRAM" (orange bar)</li>
        <li><strong>Button hover:</strong> "Click here to transfer workline to '8 years Warranty program' and open '8 years Warranty program' form"</li>
        <li><strong>SAGAI down:</strong> "SAGAI not available" (existing message)</li>
    </ul>
    <p><em>All messages must be translatable in all languages available in PANIER.</em></p>
</div>

<h4>7. Access Rights Summary</h4>
<div class="kh-card">
    <h5>Roles with BrandCare Access</h5>
    <ul>
        <li>Aftersales Manager</li>
        <li>Service Advisor</li>
        <li>Warranty Specialist</li>
        <li>Service Reception Coordinator</li>
    </ul>
    <p>Users must have the BrandCare Service Applicative assigned. Independent Repairers from ERCS, POI, FIBAG, TME, EPER are excluded.</p>
</div>
`;
}

// ===== EXPORT BUTTONS =====
function initExportButtons() {
    document.getElementById('btn-copy-comm').addEventListener('click', () => {
        const text = document.getElementById('comm-output').innerText;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('btn-copy-comm');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
        });
    });

    document.getElementById('btn-export-comm').addEventListener('click', () => {
        downloadAsFile('AllureCare_Communication.html', document.getElementById('comm-output').innerHTML, 'text/html');
    });

    document.getElementById('btn-pdf-comm').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('btn-export-tp').addEventListener('click', () => {
        downloadAsFile('AllureCare_TestPlan.html', document.getElementById('testplan-output').innerHTML, 'text/html');
    });
}

function downloadAsFile(filename, content, type) {
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title><style>body{font-family:Segoe UI,sans-serif;padding:40px;font-size:14px;line-height:1.6}table{width:100%;border-collapse:collapse}th{background:#1B2A4A;color:#fff;padding:10px 12px;text-align:left}td{padding:10px 12px;border-bottom:1px solid #e0e0e0}h4{color:#1B2A4A;margin:20px 0 10px}</style></head><body>${content}</body></html>`], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}
