// ===== CommGen AI v2.0 — Stellantis Communication Generator =====

let selectedTemplateMode = 'upload'; // 'upload' or 'library'
let selectedLibraryTemplate = null;
let currentLang = 'en';
let commOriginalHTML = '';

document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initTemplateOptions();
    initTemplateGallery();
    initTabs();
    initNavigation();
});

// ===== NAVIGATION =====
function initNavigation() {
    document.querySelectorAll('.top-nav a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const target = a.dataset.nav;
            if (target === 'templates') {
                showTemplatesPage();
            } else if (target === 'generator') {
                hideTemplatesPage();
            }
        });
    });
}

function showTemplatesPage() {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active-step'));
    document.getElementById('page-templates').style.display = 'block';
    document.querySelectorAll('.top-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector('[data-nav="templates"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideTemplatesPage() {
    document.getElementById('page-templates').style.display = 'none';
    document.getElementById('step-upload').classList.add('active-step');
    document.querySelectorAll('.top-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector('[data-nav="generator"]').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== TEMPLATE OPTIONS (Upload vs Library) =====
function initTemplateOptions() {
    const optUpload = document.getElementById('opt-upload-word');
    const optLibrary = document.getElementById('opt-choose-library');
    const dropzone = document.getElementById('dropzone-template');
    const libraryZone = document.getElementById('library-btn-zone');

    optUpload.addEventListener('click', () => {
        selectedTemplateMode = 'upload';
        optUpload.querySelector('.opt-radio').classList.add('selected');
        optLibrary.querySelector('.opt-radio').classList.remove('selected');
        optUpload.classList.add('active');
        optLibrary.classList.remove('active');
        dropzone.style.display = 'flex';
        libraryZone.style.display = 'none';
    });

    optLibrary.addEventListener('click', () => {
        selectedTemplateMode = 'library';
        optLibrary.querySelector('.opt-radio').classList.add('selected');
        optUpload.querySelector('.opt-radio').classList.remove('selected');
        optLibrary.classList.add('active');
        optUpload.classList.remove('active');
        dropzone.style.display = 'none';
        libraryZone.style.display = 'block';
    });

    document.getElementById('btn-open-library').addEventListener('click', () => {
        showTemplatesPage();
    });

    // "Use This Template" from gallery
    document.getElementById('btn-use-template').addEventListener('click', () => {
        if (selectedLibraryTemplate) {
            const name = getTemplateName(selectedLibraryTemplate);
            document.getElementById('library-selected').style.display = 'flex';
            document.getElementById('library-selected-name').textContent = name;
            document.getElementById('upload-template').classList.add('uploaded');
            document.getElementById('status-template').textContent = '✓ Template: ' + name;
            document.getElementById('status-template').className = 'upload-status success';
            hideTemplatesPage();
            checkAnalyzeReady();
        }
    });
}

// ===== TEMPLATE GALLERY =====
function initTemplateGallery() {
    const cards = document.querySelectorAll('.tpl-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedLibraryTemplate = card.dataset.tpl;
            document.getElementById('tpl-selected-bar').style.display = 'flex';
            document.getElementById('tpl-selected-name').textContent = getTemplateName(selectedLibraryTemplate);
        });
    });
}

function getTemplateName(id) {
    const names = {
        'basket-720': 'Basket Communication v7.20',
        'country-note': 'Country Note',
        'tech-bulletin': 'Technical Bulletin',
        'release-note': 'Release Note',
        'training-comm': 'Training Communication',
        'warranty-alert': 'Warranty Alert'
    };
    return names[id] || id;
}

// ===== FILE UPLOAD =====
let specReady = false, templateReady = false;

function initUpload() {
    const fileSpec = document.getElementById('file-spec');
    const fileTemplate = document.getElementById('file-template');
    const btnAnalyze = document.getElementById('btn-analyze');

    fileSpec.addEventListener('change', () => {
        if (fileSpec.files.length) {
            specReady = true;
            document.getElementById('upload-spec').classList.add('uploaded');
            document.getElementById('status-spec').textContent = '✓ ' + fileSpec.files[0].name;
            document.getElementById('status-spec').className = 'upload-status success';
            checkAnalyzeReady();
        }
    });

    fileTemplate.addEventListener('change', () => {
        if (fileTemplate.files.length) {
            templateReady = true;
            document.getElementById('upload-template').classList.add('uploaded');
            document.getElementById('status-template').textContent = '✓ ' + fileTemplate.files[0].name + ' (Word format preserved)';
            document.getElementById('status-template').className = 'upload-status success';
            checkAnalyzeReady();
        }
    });

    btnAnalyze.addEventListener('click', () => {
        showStep('step-analysis');
        runAnalysis();
    });

    document.getElementById('btn-generate').addEventListener('click', () => {
        showStep('step-dashboard');
        renderAllOutputs();
    });

    // Demo mode — double-click
    btnAnalyze.addEventListener('dblclick', () => {
        specReady = true; templateReady = true;
        document.getElementById('upload-spec').classList.add('uploaded');
        document.getElementById('status-spec').textContent = '✓ CAP-37495_PNR 10279_DFS_AllureCare_V4.0.docx';
        document.getElementById('status-spec').className = 'upload-status success';
        document.getElementById('upload-template').classList.add('uploaded');
        document.getElementById('status-template').textContent = '✓ Basket 7.20_Communication_EN.docx (Word format preserved)';
        document.getElementById('status-template').className = 'upload-status success';
        btnAnalyze.disabled = false;
    });
}

function checkAnalyzeReady() {
    const tplReady = templateReady || (selectedTemplateMode === 'library' && selectedLibraryTemplate);
    document.getElementById('btn-analyze').disabled = !(specReady && tplReady);
}

function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active-step'));
    document.getElementById('page-templates').style.display = 'none';
    document.getElementById(id).classList.add('active-step');
    document.querySelectorAll('.top-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector('[data-nav="generator"]').classList.add('active');
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
        // Update detected template name
        const tplName = selectedTemplateMode === 'library' && selectedLibraryTemplate
            ? getTemplateName(selectedLibraryTemplate)
            : 'Basket 7.20 Communication EN';
        document.getElementById('detected-tpl-name').textContent = tplName;

        // Show Word format notice if uploaded
        if (selectedTemplateMode === 'upload') {
            document.getElementById('detection-format').style.display = 'flex';
        }

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
    initTranslation();
}

// ===== GENERATED COMMUNICATION (Strict Template Mode) =====
function renderCommunication() {
    const html = getCommunicationHTML('en');
    document.getElementById('comm-output').innerHTML = html;
    commOriginalHTML = html;
}

function getCommunicationHTML(lang) {
    const t = translations[lang] || translations['en'];
    return `
<div class="comm-header-block">
    <p><strong>${t.countryNote}</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Poissy, ${t.date}</p>
    <p><strong>${t.sender}</strong></p>
    <p>${t.from}: AFFI/PS/TS/NSS</p>
    <p><strong>${t.receivers}</strong></p>
    <p>${t.allSubsidiaries}</p>
    <p><strong>REF:</strong> CAP-37495 / PNR-10279</p>
    <p><strong>${t.subject}:</strong> Service Box – Basket, ${t.allureCareIntegration}</p>
</div>

<div class="word-image-placeholder">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="3" stroke="#BDBDBD" stroke-width="2"/><circle cx="12" cy="13" r="3" stroke="#BDBDBD" stroke-width="1.5"/><path d="M4 22l6-6 4 4 4-4 10 10" stroke="#BDBDBD" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <br>${t.stellantisLogo}
</div>

<h4>${t.importantInfo}</h4>
<p><strong>${t.evolutions}</strong></p>
<ul>
    <li>${t.evoSummary}</li>
</ul>

<p>${t.hello},</p>
<p>${t.introText}</p>
<p>${t.majorPoints}</p>
<p>${t.availableStarting} <strong>[${t.deploymentDateTBD}]</strong>.</p>

<h4>${t.evolutions}</h4>
<p>${t.evoDescription}</p>

<p>${t.startingDeployment}:</p>
<ul>
    <li><strong>${t.vinEligibility}:</strong> ${t.vinEligibilityDesc}</li>
    <li><strong>${t.brandcareContract}:</strong> ${t.brandcareContractDesc}</li>
    <li><strong>${t.worklineCreation}:</strong> ${t.worklineCreationDesc}</li>
    <li><strong>${t.brandcareCheckbox}:</strong> ${t.brandcareCheckboxDesc}
        <ul>
            <li>${t.crit1}</li>
            <li>${t.crit2}</li>
            <li>${t.crit3}</li>
            <li>${t.crit4}</li>
            <li>${t.crit5}</li>
            <li>${t.crit6}</li>
        </ul>
    </li>
    <li><strong>${t.transferBCF}:</strong> ${t.transferBCFDesc}</li>
</ul>

<div class="word-image-placeholder">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="2" y="6" width="28" height="20" rx="3" stroke="#BDBDBD" stroke-width="2"/><path d="M8 14h6M8 18h4M18 12h6M18 16h8M18 20h5" stroke="#BDBDBD" stroke-width="1.5" stroke-linecap="round"/></svg>
    <br>${t.screenshotDMS}
</div>

<p>${t.jobRoles}</p>
<p>${t.newCharacteristic}</p>

<div class="training-box">
    <strong>${t.training}:</strong> ${t.trainingDesc}
    <ul>
        <li>FR: <em>${t.linkTBC}</em></li>
        <li>${t.otherCountries}</li>
    </ul>
</div>

<div class="highlight-box">
    ${t.importantWarning}
</div>

<h4>${t.keyMessages}</h4>
<ul>
    <li>${t.msg1}</li>
    <li>${t.msg2}</li>
    <li>${t.msg3}</li>
    <li>${t.msg4}</li>
    <li>${t.msg5}</li>
    <li>${t.msg6}</li>
</ul>

<h4>${t.deploymentInfo}</h4>
<ul>
    <li><strong>${t.application}:</strong> Service Box – PANIER (Basket)</li>
    <li><strong>${t.scope}:</strong> ${t.scopeValue}</li>
    <li><strong>${t.availability}:</strong> ${t.availabilityValue} <strong>[${t.deploymentDateTBD}]</strong></li>
    <li><strong>${t.integratedSystems}:</strong> HUB, DMBR (BrandCare Forms), BRR, CEM/SAGAI, CIN</li>
    <li><strong>${t.authentication}:</strong> Ping Federate IDP OAuth 2.0 token (APIC URL)</li>
    <li><strong>${t.browsers}:</strong> ${t.browsersValue}</li>
</ul>

<div class="word-image-placeholder">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="3" stroke="#BDBDBD" stroke-width="2"/><path d="M10 16h12M16 10v12" stroke="#BDBDBD" stroke-width="2" stroke-linecap="round"/></svg>
    <br>${t.architectureDiagram}
</div>

<p>${t.thankYou}</p>
`;
}

// ===== TRANSLATIONS =====
const translations = {
    en: {
        countryNote: 'COUNTRY NOTE', date: 'March 25th, 2026', sender: 'SENDER', from: 'From',
        receivers: 'RECEIVER(S)', allSubsidiaries: 'All subsidiaries and importers',
        subject: 'Subject', allureCareIntegration: 'Allure Care Program (BrandCare) Integration',
        stellantisLogo: '[Stellantis Header Logo — preserved from uploaded Word template]',
        importantInfo: 'Important Information and Key Points of the Note',
        evolutions: 'Evolutions', hello: 'Hello',
        evoSummary: 'Allure Care Program (BrandCare): Full integration of the 8-Year Warranty Programme activation process within PANIER (Service Box Basket).',
        introText: 'We have introduced a major Enhancement in this new release of the Basket application of Service Box to support the Allure Care Program (BrandCare).',
        majorPoints: 'The major points are highlighted below.',
        availableStarting: 'Kindly note that these improvements will be available starting at noon on',
        deploymentDateTBD: 'Deployment Date TBD',
        evoDescription: 'The Allure Care Program — part of the 8-Year Warranty Programme (Peugeot Care, Citroën We Care, DS Serenity, Opel 8Y Warranty) — is now fully integrated into PANIER (Service Box Basket). This evolution enables Authorised Repairers (ARs) to manage BrandCare eligibility checks, create dedicated service worklines, and transfer workline data to BrandCare Forms (DMBR) directly from the Basket application.',
        startingDeployment: 'Starting from deployment, the following capabilities will be available in Service Box for eligible vehicles',
        vinEligibility: 'VIN Eligibility Check',
        vinEligibilityDesc: 'PANIER will automatically request VIN eligibility from HUB when a VIN is searched, a folder is created/opened, or the VIN is changed. HUB will return eligibility status including contribution flag, engine type (BEV/NON-BEV), and vehicle type (PC/LCV).',
        brandcareContract: 'BrandCare Contract Display',
        brandcareContractDesc: 'If BrandCare contract information is received from SAGAI, it will be displayed on the Vehicle Landing page, Customer Vehicle page, and Synthesis page alongside other warranty contracts.',
        worklineCreation: 'BrandCare Workline Creation',
        worklineCreationDesc: 'ARs can create BrandCare service worklines using designated systematic operation codes (e.g. 93830000, 95R48A) in the Workline Code field on the Repair Order screen. Workline Allocation Type must be set to "Manufacturer".',
        brandcareCheckbox: 'BrandCare Checkbox on DMS Transfer Screen',
        brandcareCheckboxDesc: 'A new "BrandCare" column with a checkbox will appear on the DMS Transfer screen for worklines meeting all eligibility criteria:',
        crit1: 'VIN eligibility status received from HUB (Eligibility Status = 1)',
        crit2: "Characteristic 'CARE_PROGRAM' assigned to the dealer RRDI of the vehicle Reception brand",
        crit3: 'Reception brand is the same as VIN brand',
        crit4: 'Logged-in user has the BrandCare service applicative assigned',
        crit5: 'Workline has a designated BrandCare systematic operation code',
        crit6: 'Workline Allocation Type is "Manufacturer"',
        transferBCF: 'Transfer to BrandCare Forms',
        transferBCFDesc: 'A new button "Transfer to 8 years Warranty program" will appear on the DMS Transfer Results page. On click, PANIER sends workline, folder details, and vehicle information to BrandCare Forms (DMBR) via JWT token (OAuth 2.0 / Ping Federate), opening the form in a new browser tab.',
        screenshotDMS: '[Screenshot: DMS Transfer Screen with BrandCare column — preserved from uploaded Word template]',
        jobRoles: 'This evolution is applicable for the following Job Roles: Aftersales Manager, Service Advisor, Warranty Specialist, Service Reception Coordinator.',
        newCharacteristic: 'A new characteristic "CARE_PROGRAM" will be available in My Dealership for eligible dealers.',
        training: 'Training',
        trainingDesc: 'A Virtual Class Training dedicated to the dealer journey will be activated for G10 countries.',
        linkTBC: 'Link to be communicated',
        otherCountries: 'Other countries: To be communicated shortly',
        importantWarning: 'Important: The training must be completed before submitting the BrandCare forms in order to secure the activation of the 8-year warranty coverage and avoid any processing issues. The workline must be successfully transferred to DMS before it can be transferred to BrandCare Forms.',
        keyMessages: 'Key Messages & Warnings',
        msg1: 'If the Reception Brand differs from the VIN brand, the following message will be displayed: "Reception Brand is different from the VIN brand, workline cannot be transferred to 8 years Warranty program."',
        msg2: 'If mandatory parameters required for BrandCare transfer are missing, the BrandCare checkbox will be visible but greyed out, with an explanatory orange-bar message on the DMS Transfer page.',
        msg3: 'If DMS Transfer is not successful, the "Transfer to 8 years Warranty program" button will be greyed out with a tooltip.',
        msg4: 'This evolution is applicable only for G10 countries. HUB maintains the list of eligible G10 countries.',
        msg5: 'Only Peugeot and Citroën vehicles are in scope for now. DS and Opel will follow in future releases.',
        msg6: 'All LCV vehicles are currently out of scope.',
        deploymentInfo: 'Deployment Information',
        application: 'Application', scope: 'Scope', scopeValue: 'G10 EU markets — Peugeot & Citroën brands',
        availability: 'Availability', availabilityValue: 'From',
        integratedSystems: 'Integrated Systems', authentication: 'Authentication',
        browsers: 'Browsers', browsersValue: 'Stellantis-approved versions of Edge and Chrome',
        architectureDiagram: '[Architecture Diagram: PANIER-HUB-DMBR Integration Flow — preserved from uploaded Word template]',
        thankYou: 'Thank you for your attention and cooperation in ensuring a smooth implementation. Should you have any questions, please do not hesitate to reach out.',
    },
    fr: {
        countryNote: 'NOTE PAYS', date: '25 mars 2026', sender: 'EXPÉDITEUR', from: 'De',
        receivers: 'DESTINATAIRE(S)', allSubsidiaries: 'Toutes les filiales et importateurs',
        subject: 'Objet', allureCareIntegration: "Intégration du Programme Allure Care (BrandCare)",
        stellantisLogo: '[Logo Stellantis en en-tête — préservé du template Word uploadé]',
        importantInfo: 'Informations Importantes et Points Clés de la Note',
        evolutions: 'Évolutions', hello: 'Bonjour',
        evoSummary: "Programme Allure Care (BrandCare) : Intégration complète du processus d'activation de la Garantie 8 Ans dans PANIER (Service Box Basket).",
        introText: "Nous avons introduit une évolution majeure dans cette nouvelle version de l'application Basket de Service Box pour supporter le Programme Allure Care (BrandCare).",
        majorPoints: 'Les points majeurs sont détaillés ci-dessous.',
        availableStarting: 'Veuillez noter que ces améliorations seront disponibles à partir de midi le',
        deploymentDateTBD: 'Date de déploiement à confirmer',
        evoDescription: "Le Programme Allure Care — faisant partie du Programme de Garantie 8 Ans (Peugeot Care, Citroën We Care, DS Serenity, Opel 8Y Warranty) — est désormais entièrement intégré dans PANIER (Service Box Basket). Cette évolution permet aux Réparateurs Agréés (RA) de gérer les vérifications d'éligibilité BrandCare, de créer des lignes de travail dédiées et de transférer les données vers les formulaires BrandCare (DMBR) directement depuis l'application Basket.",
        startingDeployment: 'À partir du déploiement, les fonctionnalités suivantes seront disponibles dans Service Box pour les véhicules éligibles',
        vinEligibility: "Vérification d'Éligibilité VIN",
        vinEligibilityDesc: "PANIER demandera automatiquement l'éligibilité VIN au HUB lors d'une recherche VIN, de la création/ouverture d'un dossier, ou du changement de VIN. Le HUB retournera le statut d'éligibilité incluant le drapeau de contribution, le type de moteur (BEV/NON-BEV) et le type de véhicule (PC/LCV).",
        brandcareContract: 'Affichage des Contrats BrandCare',
        brandcareContractDesc: "Si les informations de contrat BrandCare sont reçues de SAGAI, elles seront affichées sur la page d'arrivée Véhicule, la page Client Véhicule et la page Synthèse aux côtés des autres contrats de garantie.",
        worklineCreation: 'Création de Ligne de Travail BrandCare',
        worklineCreationDesc: "Les RA peuvent créer des lignes de travail BrandCare en utilisant les codes d'opérations systématiques désignés (ex: 93830000, 95R48A) dans le champ Code Ligne de Travail sur l'écran Ordre de Réparation. Le Type d'Allocation doit être défini sur \"Constructeur\".",
        brandcareCheckbox: "Case à Cocher BrandCare sur l'Écran de Transfert DMS",
        brandcareCheckboxDesc: "Une nouvelle colonne \"BrandCare\" avec une case à cocher apparaîtra sur l'écran de Transfert DMS pour les lignes de travail remplissant tous les critères d'éligibilité :",
        crit1: "Statut d'éligibilité VIN reçu du HUB (Statut d'Éligibilité = 1)",
        crit2: "Caractéristique 'CARE_PROGRAM' assignée au RRDI du concessionnaire de la marque de Réception du véhicule",
        crit3: 'La marque de Réception est identique à la marque du VIN',
        crit4: "L'utilisateur connecté a l'applicatif de service BrandCare assigné",
        crit5: "La ligne de travail a un code d'opération systématique BrandCare désigné",
        crit6: "Le Type d'Allocation de la ligne de travail est \"Constructeur\"",
        transferBCF: 'Transfert vers les Formulaires BrandCare',
        transferBCFDesc: "Un nouveau bouton \"Transfert vers le programme Garantie 8 ans\" apparaîtra sur la page Résultats de Transfert DMS. Au clic, PANIER envoie les détails de la ligne de travail, du dossier et du véhicule vers les Formulaires BrandCare (DMBR) via jeton JWT (OAuth 2.0 / Ping Federate), ouvrant le formulaire dans un nouvel onglet.",
        screenshotDMS: "[Capture d'écran : Écran de Transfert DMS avec colonne BrandCare — préservé du template Word uploadé]",
        jobRoles: "Cette évolution est applicable pour les rôles suivants : Responsable Après-Vente, Conseiller Service, Spécialiste Garantie, Coordinateur Réception Service.",
        newCharacteristic: 'Une nouvelle caractéristique "CARE_PROGRAM" sera disponible dans Mon Concessionnaire pour les concessionnaires éligibles.',
        training: 'Formation',
        trainingDesc: 'Une Formation en Classe Virtuelle dédiée au parcours concessionnaire sera activée pour les pays G10.',
        linkTBC: 'Lien à communiquer',
        otherCountries: 'Autres pays : À communiquer prochainement',
        importantWarning: "Important : La formation doit être complétée avant de soumettre les formulaires BrandCare afin de sécuriser l'activation de la couverture de garantie 8 ans et éviter tout problème de traitement. La ligne de travail doit être transférée avec succès au DMS avant de pouvoir être transférée aux Formulaires BrandCare.",
        keyMessages: 'Messages Clés et Avertissements',
        msg1: "Si la Marque de Réception diffère de la marque du VIN, le message suivant sera affiché : \"La Marque de Réception est différente de la marque du VIN, la ligne de travail ne peut pas être transférée au programme Garantie 8 ans.\"",
        msg2: "Si les paramètres obligatoires requis pour le transfert BrandCare sont manquants, la case à cocher BrandCare sera visible mais grisée, avec un message explicatif en barre orange sur la page de Transfert DMS.",
        msg3: "Si le Transfert DMS n'est pas réussi, le bouton \"Transfert vers le programme Garantie 8 ans\" sera grisé avec une info-bulle.",
        msg4: "Cette évolution est applicable uniquement pour les pays G10. Le HUB maintient la liste des pays G10 éligibles.",
        msg5: 'Seuls les véhicules Peugeot et Citroën sont dans le périmètre pour le moment. DS et Opel suivront dans les prochaines versions.',
        msg6: 'Tous les véhicules VUL sont actuellement hors périmètre.',
        deploymentInfo: 'Informations de Déploiement',
        application: 'Application', scope: 'Périmètre', scopeValue: 'Marchés G10 UE — Marques Peugeot et Citroën',
        availability: 'Disponibilité', availabilityValue: 'À partir du',
        integratedSystems: 'Systèmes Intégrés', authentication: 'Authentification',
        browsers: 'Navigateurs', browsersValue: "Versions approuvées Stellantis d'Edge et Chrome",
        architectureDiagram: "[Schéma d'Architecture : Flux d'Intégration PANIER-HUB-DMBR — préservé du template Word uploadé]",
        thankYou: "Nous vous remercions de votre attention et de votre coopération pour assurer une mise en œuvre fluide. N'hésitez pas à nous contacter pour toute question.",
    },
    de: {
        countryNote: 'LÄNDERNOTIZ', date: '25. März 2026', sender: 'ABSENDER', from: 'Von',
        receivers: 'EMPFÄNGER', allSubsidiaries: 'Alle Tochtergesellschaften und Importeure',
        subject: 'Betreff', allureCareIntegration: 'Integration des Allure Care Programms (BrandCare)',
        stellantisLogo: '[Stellantis-Header-Logo — aus hochgeladenem Word-Template übernommen]',
        importantInfo: 'Wichtige Informationen und Kernpunkte der Mitteilung',
        evolutions: 'Weiterentwicklungen', hello: 'Sehr geehrte Damen und Herren',
        evoSummary: 'Allure Care Programm (BrandCare): Vollständige Integration des Aktivierungsprozesses der 8-Jahres-Garantie in PANIER (Service Box Basket).',
        introText: 'Wir haben eine wesentliche Erweiterung in dieser neuen Version der Basket-Anwendung von Service Box eingeführt, um das Allure Care Programm (BrandCare) zu unterstützen.',
        majorPoints: 'Die wichtigsten Punkte sind nachfolgend hervorgehoben.',
        availableStarting: 'Bitte beachten Sie, dass diese Verbesserungen ab Mittag verfügbar sein werden am',
        deploymentDateTBD: 'Bereitstellungsdatum noch festzulegen',
        evoDescription: 'Das Allure Care Programm — Teil des 8-Jahres-Garantieprogramms (Peugeot Care, Citroën We Care, DS Serenity, Opel 8Y Warranty) — ist nun vollständig in PANIER (Service Box Basket) integriert. Diese Weiterentwicklung ermöglicht es autorisierten Werkstätten (AR), BrandCare-Berechtigungsprüfungen durchzuführen, dedizierte Service-Arbeitszeilen zu erstellen und Arbeitszeilendaten direkt aus der Basket-Anwendung an BrandCare-Formulare (DMBR) zu übertragen.',
        startingDeployment: 'Ab der Bereitstellung stehen folgende Funktionen in Service Box für berechtigte Fahrzeuge zur Verfügung',
        vinEligibility: 'VIN-Berechtigungsprüfung', vinEligibilityDesc: 'PANIER fordert automatisch die VIN-Berechtigung vom HUB an, wenn eine VIN gesucht, ein Ordner erstellt/geöffnet oder die VIN geändert wird.',
        brandcareContract: 'BrandCare-Vertragsanzeige', brandcareContractDesc: 'Wenn BrandCare-Vertragsinformationen von SAGAI empfangen werden, werden diese auf der Fahrzeug-Startseite, der Kunden-Fahrzeug-Seite und der Übersichtsseite angezeigt.',
        worklineCreation: 'BrandCare-Arbeitszeilenerstellung', worklineCreationDesc: 'ARs können BrandCare-Service-Arbeitszeilen mit den vorgesehenen systematischen Operationscodes erstellen.',
        brandcareCheckbox: 'BrandCare-Kontrollkästchen auf dem DMS-Transferbildschirm', brandcareCheckboxDesc: 'Eine neue "BrandCare"-Spalte mit Kontrollkästchen erscheint auf dem DMS-Transferbildschirm:',
        crit1: 'VIN-Berechtigungsstatus vom HUB empfangen (Status = 1)', crit2: "Merkmal 'CARE_PROGRAM' dem Händler-RRDI zugewiesen",
        crit3: 'Empfangsmarke entspricht der VIN-Marke', crit4: 'Angemeldeter Benutzer hat BrandCare-Service-Applikativ zugewiesen',
        crit5: 'Arbeitszeile hat einen BrandCare-Operationscode', crit6: 'Arbeitszeilenzuordnungstyp ist "Hersteller"',
        transferBCF: 'Übertragung an BrandCare-Formulare', transferBCFDesc: 'Ein neuer Button "Übertragung an 8-Jahres-Garantieprogramm" erscheint auf der DMS-Transferergebnisseite.',
        screenshotDMS: '[Screenshot: DMS-Transferbildschirm — aus Word-Template übernommen]',
        jobRoles: 'Diese Weiterentwicklung gilt für: Aftersales-Manager, Serviceberater, Garantiespezialist, Service-Empfangskoordinator.',
        newCharacteristic: 'Ein neues Merkmal "CARE_PROGRAM" wird in Mein Autohaus für berechtigte Händler verfügbar sein.',
        training: 'Schulung', trainingDesc: 'Eine virtuelle Klassenschulung wird für G10-Länder aktiviert.',
        linkTBC: 'Link wird mitgeteilt', otherCountries: 'Andere Länder: Wird in Kürze mitgeteilt',
        importantWarning: 'Wichtig: Die Schulung muss vor der Einreichung der BrandCare-Formulare abgeschlossen werden.',
        keyMessages: 'Wichtige Hinweise und Warnungen',
        msg1: 'Wenn die Empfangsmarke von der VIN-Marke abweicht, wird eine Warnmeldung angezeigt.',
        msg2: 'Bei fehlenden Pflichtparametern wird das BrandCare-Kontrollkästchen ausgegraut.',
        msg3: 'Bei fehlgeschlagenem DMS-Transfer wird der Button ausgegraut.',
        msg4: 'Diese Weiterentwicklung gilt nur für G10-Länder.',
        msg5: 'Nur Peugeot- und Citroën-Fahrzeuge sind aktuell im Umfang. DS und Opel folgen.',
        msg6: 'Alle LCV-Fahrzeuge sind derzeit ausgeschlossen.',
        deploymentInfo: 'Bereitstellungsinformationen',
        application: 'Anwendung', scope: 'Umfang', scopeValue: 'G10 EU-Märkte — Peugeot & Citroën',
        availability: 'Verfügbarkeit', availabilityValue: 'Ab',
        integratedSystems: 'Integrierte Systeme', authentication: 'Authentifizierung',
        browsers: 'Browser', browsersValue: 'Von Stellantis genehmigte Versionen von Edge und Chrome',
        architectureDiagram: '[Architekturdiagramm — aus Word-Template übernommen]',
        thankYou: 'Vielen Dank für Ihre Aufmerksamkeit und Mitwirkung bei der reibungslosen Umsetzung.',
    },
    es: {
        countryNote: 'NOTA PAÍS', date: '25 de marzo de 2026', sender: 'REMITENTE', from: 'De',
        receivers: 'DESTINATARIO(S)', allSubsidiaries: 'Todas las filiales e importadores',
        subject: 'Asunto', allureCareIntegration: 'Integración del Programa Allure Care (BrandCare)',
        stellantisLogo: '[Logo Stellantis — preservado del template Word cargado]',
        importantInfo: 'Información Importante y Puntos Clave de la Nota',
        evolutions: 'Evoluciones', hello: 'Estimados',
        evoSummary: 'Programa Allure Care (BrandCare): Integración completa del proceso de activación de la Garantía de 8 Años en PANIER (Service Box Basket).',
        introText: 'Hemos introducido una mejora importante en esta nueva versión de la aplicación Basket de Service Box para soportar el Programa Allure Care (BrandCare).',
        majorPoints: 'Los puntos principales se detallan a continuación.',
        availableStarting: 'Tenga en cuenta que estas mejoras estarán disponibles a partir del mediodía del',
        deploymentDateTBD: 'Fecha de despliegue por confirmar',
        evoDescription: 'El Programa Allure Care — parte del Programa de Garantía de 8 Años — está ahora completamente integrado en PANIER.',
        startingDeployment: 'A partir del despliegue, las siguientes capacidades estarán disponibles',
        vinEligibility: 'Verificación de Elegibilidad VIN', vinEligibilityDesc: 'PANIER solicitará automáticamente la elegibilidad VIN al HUB.',
        brandcareContract: 'Visualización de Contratos BrandCare', brandcareContractDesc: 'La información de contrato BrandCare se mostrará en las páginas correspondientes.',
        worklineCreation: 'Creación de Línea de Trabajo BrandCare', worklineCreationDesc: 'Los RA pueden crear líneas de trabajo BrandCare usando los códigos de operación sistemática designados.',
        brandcareCheckbox: 'Casilla BrandCare en Pantalla de Transferencia DMS', brandcareCheckboxDesc: 'Una nueva columna "BrandCare" aparecerá en la pantalla de Transferencia DMS:',
        crit1: 'Estado de elegibilidad VIN recibido del HUB (Estado = 1)', crit2: "Característica 'CARE_PROGRAM' asignada al RRDI del concesionario",
        crit3: 'La marca de recepción es igual a la marca del VIN', crit4: 'El usuario tiene el aplicativo BrandCare asignado',
        crit5: 'La línea de trabajo tiene un código de operación BrandCare', crit6: 'El tipo de asignación es "Fabricante"',
        transferBCF: 'Transferencia a Formularios BrandCare', transferBCFDesc: 'Un nuevo botón "Transferir al programa Garantía 8 años" aparecerá en la página de resultados.',
        screenshotDMS: '[Captura de pantalla: Pantalla DMS — preservada del template Word]',
        jobRoles: 'Esta evolución aplica para: Gerente de Posventa, Asesor de Servicio, Especialista en Garantías.',
        newCharacteristic: 'Una nueva característica "CARE_PROGRAM" estará disponible para concesionarios elegibles.',
        training: 'Formación', trainingDesc: 'Se activará una formación virtual para los países G10.',
        linkTBC: 'Enlace por comunicar', otherCountries: 'Otros países: Se comunicará en breve',
        importantWarning: 'Importante: La formación debe completarse antes de enviar los formularios BrandCare.',
        keyMessages: 'Mensajes Clave y Advertencias',
        msg1: 'Si la marca de recepción difiere de la marca del VIN, se mostrará un mensaje de advertencia.',
        msg2: 'Si faltan parámetros obligatorios, la casilla BrandCare estará visible pero desactivada.',
        msg3: 'Si la transferencia DMS no es exitosa, el botón estará desactivado.',
        msg4: 'Esta evolución aplica solo para países G10.', msg5: 'Solo Peugeot y Citroën están en alcance actualmente.',
        msg6: 'Todos los vehículos LCV están fuera de alcance.',
        deploymentInfo: 'Información de Despliegue',
        application: 'Aplicación', scope: 'Alcance', scopeValue: 'Mercados G10 UE — Peugeot y Citroën',
        availability: 'Disponibilidad', availabilityValue: 'A partir del',
        integratedSystems: 'Sistemas Integrados', authentication: 'Autenticación',
        browsers: 'Navegadores', browsersValue: 'Versiones aprobadas por Stellantis de Edge y Chrome',
        architectureDiagram: '[Diagrama de arquitectura — preservado del template Word]',
        thankYou: 'Gracias por su atención y cooperación.',
    },
    it: {
        countryNote: 'NOTA PAESE', date: '25 marzo 2026', sender: 'MITTENTE', from: 'Da',
        receivers: 'DESTINATARIO/I', allSubsidiaries: 'Tutte le filiali e importatori',
        subject: 'Oggetto', allureCareIntegration: 'Integrazione del Programma Allure Care (BrandCare)',
        stellantisLogo: '[Logo Stellantis — preservato dal template Word caricato]',
        importantInfo: 'Informazioni Importanti e Punti Chiave della Nota',
        evolutions: 'Evoluzioni', hello: 'Buongiorno',
        evoSummary: "Programma Allure Care (BrandCare): Integrazione completa del processo di attivazione della Garanzia 8 Anni in PANIER.",
        introText: "Abbiamo introdotto un'importante evoluzione in questa nuova versione dell'applicazione Basket di Service Box.",
        majorPoints: 'I punti principali sono evidenziati di seguito.',
        availableStarting: 'Si prega di notare che questi miglioramenti saranno disponibili a partire da mezzogiorno del',
        deploymentDateTBD: 'Data di distribuzione da confermare',
        evoDescription: "Il Programma Allure Care è ora completamente integrato in PANIER (Service Box Basket).",
        startingDeployment: 'A partire dalla distribuzione, le seguenti funzionalità saranno disponibili',
        vinEligibility: 'Verifica Idoneità VIN', vinEligibilityDesc: "PANIER richiederà automaticamente l'idoneità VIN all'HUB.",
        brandcareContract: 'Visualizzazione Contratti BrandCare', brandcareContractDesc: 'Le informazioni contrattuali BrandCare saranno visualizzate sulle pagine corrispondenti.',
        worklineCreation: 'Creazione Linea di Lavoro BrandCare', worklineCreationDesc: 'Gli RA possono creare linee di lavoro BrandCare utilizzando i codici operativi designati.',
        brandcareCheckbox: 'Casella BrandCare nella Schermata di Trasferimento DMS', brandcareCheckboxDesc: 'Una nuova colonna "BrandCare" apparirà nella schermata di trasferimento DMS:',
        crit1: "Stato di idoneità VIN ricevuto dall'HUB (Stato = 1)", crit2: "Caratteristica 'CARE_PROGRAM' assegnata al RRDI del concessionario",
        crit3: 'Il marchio di ricezione è uguale al marchio VIN', crit4: "L'utente ha l'applicativo BrandCare assegnato",
        crit5: 'La linea di lavoro ha un codice operativo BrandCare', crit6: 'Il tipo di allocazione è "Costruttore"',
        transferBCF: 'Trasferimento ai Moduli BrandCare', transferBCFDesc: 'Un nuovo pulsante "Trasferimento al programma Garanzia 8 anni" apparirà nella pagina dei risultati.',
        screenshotDMS: '[Screenshot: Schermata DMS — preservato dal template Word]',
        jobRoles: 'Questa evoluzione è applicabile per: Responsabile Post-Vendita, Consulente di Servizio, Specialista Garanzie.',
        newCharacteristic: 'Una nuova caratteristica "CARE_PROGRAM" sarà disponibile per i concessionari idonei.',
        training: 'Formazione', trainingDesc: 'Una formazione virtuale sarà attivata per i paesi G10.',
        linkTBC: 'Link da comunicare', otherCountries: 'Altri paesi: Sarà comunicato a breve',
        importantWarning: 'Importante: La formazione deve essere completata prima di inviare i moduli BrandCare.',
        keyMessages: 'Messaggi Chiave e Avvertenze',
        msg1: 'Se il marchio di ricezione differisce dal marchio VIN, verrà visualizzato un messaggio di avviso.',
        msg2: 'Se mancano parametri obbligatori, la casella BrandCare sarà visibile ma disattivata.',
        msg3: 'Se il trasferimento DMS non ha successo, il pulsante sarà disattivato.',
        msg4: 'Questa evoluzione è applicabile solo per i paesi G10.', msg5: 'Solo Peugeot e Citroën sono attualmente nel perimetro.',
        msg6: 'Tutti i veicoli LCV sono attualmente esclusi.',
        deploymentInfo: 'Informazioni di Distribuzione',
        application: 'Applicazione', scope: 'Ambito', scopeValue: 'Mercati G10 UE — Peugeot e Citroën',
        availability: 'Disponibilità', availabilityValue: 'A partire dal',
        integratedSystems: 'Sistemi Integrati', authentication: 'Autenticazione',
        browsers: 'Browser', browsersValue: 'Versioni approvate Stellantis di Edge e Chrome',
        architectureDiagram: '[Diagramma architettura — preservato dal template Word]',
        thankYou: 'Grazie per la vostra attenzione e collaborazione.',
    },
    pt: {
        countryNote: 'NOTA PAÍS', date: '25 de março de 2026', sender: 'REMETENTE', from: 'De',
        receivers: 'DESTINATÁRIO(S)', allSubsidiaries: 'Todas as filiais e importadores',
        subject: 'Assunto', allureCareIntegration: 'Integração do Programa Allure Care (BrandCare)',
        stellantisLogo: '[Logo Stellantis — preservado do template Word]', importantInfo: 'Informações Importantes e Pontos-Chave',
        evolutions: 'Evoluções', hello: 'Olá', evoSummary: 'Programa Allure Care (BrandCare): Integração completa na PANIER.',
        introText: 'Introduzimos uma melhoria importante nesta nova versão do Basket.', majorPoints: 'Os pontos principais estão destacados abaixo.',
        availableStarting: 'Estas melhorias estarão disponíveis a partir do meio-dia de', deploymentDateTBD: 'Data a confirmar',
        evoDescription: 'O Programa Allure Care está agora totalmente integrado no PANIER.', startingDeployment: 'As seguintes funcionalidades estarão disponíveis',
        vinEligibility: 'Verificação VIN', vinEligibilityDesc: 'PANIER solicitará automaticamente a elegibilidade VIN ao HUB.',
        brandcareContract: 'Exibição de Contratos', brandcareContractDesc: 'Informações de contrato serão exibidas nas páginas correspondentes.',
        worklineCreation: 'Criação de Linha de Trabalho', worklineCreationDesc: 'Os RA podem criar linhas de trabalho BrandCare.',
        brandcareCheckbox: 'Caixa BrandCare na Tela DMS', brandcareCheckboxDesc: 'Uma nova coluna "BrandCare" aparecerá:',
        crit1: 'Status de elegibilidade VIN recebido do HUB', crit2: "Característica 'CARE_PROGRAM' atribuída",
        crit3: 'Marca de recepção igual à marca VIN', crit4: 'Utilizador tem aplicativo BrandCare',
        crit5: 'Código de operação BrandCare presente', crit6: 'Tipo de alocação é "Fabricante"',
        transferBCF: 'Transferência para BrandCare', transferBCFDesc: 'Um novo botão aparecerá na página de resultados.',
        screenshotDMS: '[Captura de tela — preservada do template Word]',
        jobRoles: 'Aplicável para: Gestor Pós-Venda, Consultor de Serviço.', newCharacteristic: 'Nova característica "CARE_PROGRAM" disponível.',
        training: 'Formação', trainingDesc: 'Formação virtual será ativada para os países G10.',
        linkTBC: 'Link a comunicar', otherCountries: 'Outros países: Será comunicado em breve',
        importantWarning: 'Importante: A formação deve ser concluída antes de submeter os formulários BrandCare.',
        keyMessages: 'Mensagens-Chave', msg1: 'Se a marca de recepção diferir, será exibida uma mensagem.',
        msg2: 'Parâmetros em falta: caixa será visível mas desativada.', msg3: 'Transferência DMS falhada: botão desativado.',
        msg4: 'Apenas para países G10.', msg5: 'Apenas Peugeot e Citroën no âmbito atual.', msg6: 'Veículos LCV excluídos.',
        deploymentInfo: 'Informações de Implementação', application: 'Aplicação', scope: 'Âmbito', scopeValue: 'Mercados G10 UE',
        availability: 'Disponibilidade', availabilityValue: 'A partir de', integratedSystems: 'Sistemas Integrados',
        authentication: 'Autenticação', browsers: 'Navegadores', browsersValue: 'Edge e Chrome aprovados pela Stellantis',
        architectureDiagram: '[Diagrama — preservado do template Word]', thankYou: 'Obrigado pela atenção e colaboração.',
    },
    nl: {
        countryNote: 'LANDNOTITIE', date: '25 maart 2026', sender: 'AFZENDER', from: 'Van',
        receivers: 'ONTVANGER(S)', allSubsidiaries: 'Alle dochterondernemingen en importeurs',
        subject: 'Onderwerp', allureCareIntegration: 'Allure Care Programma (BrandCare) Integratie',
        stellantisLogo: '[Stellantis Logo — bewaard uit Word-sjabloon]', importantInfo: 'Belangrijke Informatie en Kernpunten',
        evolutions: 'Evoluties', hello: 'Geachte', evoSummary: 'Allure Care Programma: Volledige integratie in PANIER.',
        introText: 'We hebben een belangrijke verbetering geïntroduceerd in deze nieuwe versie van Basket.',
        majorPoints: 'De belangrijkste punten worden hieronder toegelicht.', availableStarting: 'Deze verbeteringen zijn beschikbaar vanaf',
        deploymentDateTBD: 'Datum nog te bevestigen', evoDescription: 'Het Allure Care Programma is nu volledig geïntegreerd in PANIER.',
        startingDeployment: 'De volgende mogelijkheden zijn beschikbaar', vinEligibility: 'VIN-geschiktheidscontrole',
        vinEligibilityDesc: 'PANIER vraagt automatisch VIN-geschiktheid op bij HUB.',
        brandcareContract: 'BrandCare Contractweergave', brandcareContractDesc: 'Contractinformatie wordt weergegeven op de relevante paginas.',
        worklineCreation: 'BrandCare Werklijn Aanmaken', worklineCreationDesc: 'ARs kunnen BrandCare werklijnen aanmaken met de aangewezen codes.',
        brandcareCheckbox: 'BrandCare Checkbox op DMS Transferscherm', brandcareCheckboxDesc: 'Een nieuwe "BrandCare" kolom verschijnt:',
        crit1: 'VIN-geschiktheidsstatus ontvangen van HUB', crit2: "Kenmerk 'CARE_PROGRAM' toegewezen",
        crit3: 'Ontvangstmerk is gelijk aan VIN-merk', crit4: 'Gebruiker heeft BrandCare applicatief',
        crit5: 'Werklijn heeft BrandCare operatiecode', crit6: 'Toewijzingstype is "Fabrikant"',
        transferBCF: 'Overdracht naar BrandCare', transferBCFDesc: 'Een nieuwe knop verschijnt op de resultatenpagina.',
        screenshotDMS: '[Screenshot — bewaard uit Word-sjabloon]', jobRoles: 'Van toepassing op: Aftersales Manager, Serviceadviseur.',
        newCharacteristic: 'Nieuw kenmerk "CARE_PROGRAM" beschikbaar.', training: 'Training',
        trainingDesc: 'Virtuele training wordt geactiveerd voor G10-landen.', linkTBC: 'Link wordt gecommuniceerd',
        otherCountries: 'Andere landen: Wordt binnenkort gecommuniceerd',
        importantWarning: 'Belangrijk: Training moet worden voltooid vóór het indienen van BrandCare-formulieren.',
        keyMessages: 'Belangrijke Berichten', msg1: 'Bij afwijkend ontvangstmerk wordt een waarschuwing getoond.',
        msg2: 'Ontbrekende parameters: checkbox zichtbaar maar uitgeschakeld.', msg3: 'Mislukte DMS-overdracht: knop uitgeschakeld.',
        msg4: 'Alleen voor G10-landen.', msg5: 'Alleen Peugeot en Citroën in scope.', msg6: 'LCV uitgesloten.',
        deploymentInfo: 'Implementatie-informatie', application: 'Applicatie', scope: 'Bereik', scopeValue: 'G10 EU-markten',
        availability: 'Beschikbaarheid', availabilityValue: 'Vanaf', integratedSystems: 'Geïntegreerde Systemen',
        authentication: 'Authenticatie', browsers: 'Browsers', browsersValue: 'Stellantis-goedgekeurde Edge en Chrome',
        architectureDiagram: '[Diagram — bewaard uit Word-sjabloon]', thankYou: 'Dank u voor uw aandacht en medewerking.',
    },
    pl: {
        countryNote: 'NOTA KRAJOWA', date: '25 marca 2026', sender: 'NADAWCA', from: 'Od',
        receivers: 'ODBIORCA(Y)', allSubsidiaries: 'Wszystkie filie i importerzy',
        subject: 'Temat', allureCareIntegration: 'Integracja Programu Allure Care (BrandCare)',
        stellantisLogo: '[Logo Stellantis — zachowane z szablonu Word]', importantInfo: 'Ważne Informacje i Kluczowe Punkty',
        evolutions: 'Ewolucje', hello: 'Dzień dobry', evoSummary: 'Program Allure Care: Pełna integracja w PANIER.',
        introText: 'Wprowadziliśmy ważne ulepszenie w nowej wersji aplikacji Basket.',
        majorPoints: 'Główne punkty przedstawiono poniżej.', availableStarting: 'Ulepszenia będą dostępne od południa',
        deploymentDateTBD: 'Data do potwierdzenia', evoDescription: 'Program Allure Care jest teraz w pełni zintegrowany z PANIER.',
        startingDeployment: 'Następujące funkcje będą dostępne', vinEligibility: 'Weryfikacja VIN',
        vinEligibilityDesc: 'PANIER automatycznie sprawdzi kwalifikowalność VIN w HUB.',
        brandcareContract: 'Wyświetlanie Kontraktów', brandcareContractDesc: 'Informacje o kontraktach będą wyświetlane na odpowiednich stronach.',
        worklineCreation: 'Tworzenie Linii Pracy', worklineCreationDesc: 'AR mogą tworzyć linie pracy BrandCare.',
        brandcareCheckbox: 'Pole BrandCare na Ekranie DMS', brandcareCheckboxDesc: 'Nowa kolumna "BrandCare" pojawi się:',
        crit1: 'Status kwalifikowalności VIN z HUB', crit2: "Cecha 'CARE_PROGRAM' przypisana",
        crit3: 'Marka odbioru = marka VIN', crit4: 'Użytkownik ma aplikację BrandCare',
        crit5: 'Linia pracy ma kod BrandCare', crit6: 'Typ alokacji to "Producent"',
        transferBCF: 'Transfer do BrandCare', transferBCFDesc: 'Nowy przycisk pojawi się na stronie wyników.',
        screenshotDMS: '[Zrzut ekranu — zachowany z szablonu Word]', jobRoles: 'Dotyczy: Kierownik Posprzedaży, Doradca Serwisowy.',
        newCharacteristic: 'Nowa cecha "CARE_PROGRAM" dostępna.', training: 'Szkolenie',
        trainingDesc: 'Szkolenie wirtualne zostanie uruchomione dla krajów G10.', linkTBC: 'Link do przekazania',
        otherCountries: 'Inne kraje: Wkrótce',
        importantWarning: 'Ważne: Szkolenie musi być ukończone przed wysłaniem formularzy BrandCare.',
        keyMessages: 'Kluczowe Komunikaty', msg1: 'Przy różnej marce odbioru wyświetli się ostrzeżenie.',
        msg2: 'Brakujące parametry: pole widoczne ale nieaktywne.', msg3: 'Nieudany transfer DMS: przycisk nieaktywny.',
        msg4: 'Tylko dla krajów G10.', msg5: 'Tylko Peugeot i Citroën w zakresie.', msg6: 'LCV wykluczone.',
        deploymentInfo: 'Informacje o Wdrożeniu', application: 'Aplikacja', scope: 'Zakres', scopeValue: 'Rynki G10 UE',
        availability: 'Dostępność', availabilityValue: 'Od', integratedSystems: 'Zintegrowane Systemy',
        authentication: 'Uwierzytelnianie', browsers: 'Przeglądarki', browsersValue: 'Zatwierdzone Edge i Chrome',
        architectureDiagram: '[Diagram — zachowany z szablonu Word]', thankYou: 'Dziękujemy za uwagę i współpracę.',
    }
};

// ===== TRANSLATION =====
function initTranslation() {
    const langNames = { en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', es: 'Español', pt: 'Português', nl: 'Nederlands', pl: 'Polski' };

    document.getElementById('btn-translate').addEventListener('click', () => {
        const lang = document.getElementById('select-lang').value;
        if (lang === currentLang && lang !== 'en') return;
        currentLang = lang;

        const html = getCommunicationHTML(lang);
        document.getElementById('comm-output').innerHTML = html;

        if (lang !== 'en') {
            document.getElementById('translation-notice').style.display = 'flex';
            document.getElementById('translated-lang-name').textContent = langNames[lang];
        } else {
            document.getElementById('translation-notice').style.display = 'none';
        }
    });

    document.getElementById('btn-back-original').addEventListener('click', (e) => {
        e.preventDefault();
        currentLang = 'en';
        document.getElementById('select-lang').value = 'en';
        document.getElementById('comm-output').innerHTML = commOriginalHTML;
        document.getElementById('translation-notice').style.display = 'none';
    });
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
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Word Formatting:</strong> Image placeholders, graphs, and original document formatting preserved for .docx export.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Bug Fixes Table:</strong> Not applicable — DFS does not contain bug fix items. Section intentionally omitted.</div></div>

<h4>Completeness vs Specification</h4>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>BR-01 to BR-09:</strong> All business requirements covered in the generated communication.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>BR-04 FR-03 (Engine/Vehicle Type):</strong> Mentioned but low detail. Consider adding explicit description of downstream usage.</div></div>

<h4>Naming Consistency</h4>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>"8 years Warranty program":</strong> Used consistently per DFS V4.0 update.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>"BrandCare" vs "Allure Care Program":</strong> Both terms used. Recommend adding clarifying footnote.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Button label inconsistency:</strong> DFS references both "Transfer to Care Program" and "Transfer to 8 years Warranty program".</div></div>

<h4>Risks &amp; Recommendations</h4>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Deployment Date:</strong> [TBD] — must be confirmed before distribution.</div></div>
<div class="val-item"><div class="val-icon val-warn"></div><div><strong>Importers:</strong> Explicitly out of scope in DFS but template sends to "All subsidiaries and importers."</div></div>
<div class="val-item"><div class="val-icon val-pass"></div><div><strong>Multi-language:</strong> Translation feature available for 8 languages to support G10 country distribution.</div></div>
`;
}

// ===== ACRONYM TABLE (same as before) =====
function renderAcronyms() {
    const acronyms = [
        { acr: 'AR', source: 'Spec + Comm', def: 'Authorised Repairers', status: 'ok', note: 'Defined in glossary' },
        { acr: 'PANIER', source: 'Spec + Comm', def: 'Application used for parts purchase and vehicle servicing (Basket)', status: 'ok', note: 'Defined in glossary' },
        { acr: 'VIN', source: 'Spec + Comm', def: 'Vehicle Identification Number', status: 'ok', note: 'Industry standard' },
        { acr: 'HUB', source: 'Spec + Comm', def: 'Central integration platform for eligibility routing', status: 'ok', note: 'Used in DFS context' },
        { acr: 'DMBR', source: 'Spec + Comm', def: 'Application hosting BrandCare Forms', status: 'ok', note: 'Defined in DFS' },
        { acr: 'DMS', source: 'Spec + Comm', def: 'Dealer Management System', status: 'ok', note: 'Industry standard' },
        { acr: 'BRR', source: 'Spec', def: 'Business Rules Repository', status: 'ok', note: 'Referenced in integration section' },
        { acr: 'CEM', source: 'Spec', def: 'Contract and Eligibility Management', status: 'warn', note: 'Not in DFS glossary — inferred' },
        { acr: 'SAGAI', source: 'Spec + Comm', def: 'Warranty contract information system', status: 'warn', note: 'Not in DFS glossary — inferred' },
        { acr: 'CIN', source: 'Spec', def: 'Vehicle identification system', status: 'warn', note: 'Not in DFS glossary' },
        { acr: 'SCF', source: 'Spec', def: 'BrandCare Forms hosted by DMBR', status: 'ok', note: 'Defined in glossary' },
        { acr: 'SA', source: 'Spec', def: 'Service Applicative', status: 'ok', note: 'Defined in glossary' },
        { acr: 'FDZ', source: 'Spec + Comm', def: 'Technical documentation (Fiche de Zone)', status: 'ok', note: 'Defined in glossary' },
        { acr: 'RRDI', source: 'Spec + Comm', def: 'Dealer identification code', status: 'warn', note: 'Used frequently but not in glossary' },
        { acr: 'BEV', source: 'Spec + Comm', def: 'Battery Electric Vehicle', status: 'ok', note: 'Industry standard' },
        { acr: 'LCV', source: 'Spec + Comm', def: 'Light Commercial Vehicle', status: 'ok', note: 'Industry standard' },
        { acr: 'JWT', source: 'Comm', def: 'JSON Web Token', status: 'ok', note: 'Industry standard' },
        { acr: 'CORVET', source: 'Spec', def: 'Vehicle technical data system', status: 'warn', note: 'Referenced once, not in glossary' },
        { acr: 'VIS', source: 'Spec', def: 'Vehicle Identification Short', status: 'warn', note: 'Not in glossary' },
    ];

    const statusLabel = { ok: 'Defined', warn: 'Undefined', error: 'Inconsistent' };
    const statusClass = { ok: 'acr-ok', warn: 'acr-warn', error: 'acr-error' };

    let html = `<p style="margin-bottom:16px;font-size:.9rem;"><strong>${acronyms.length}</strong> acronyms detected. <strong>${acronyms.filter(a => a.status !== 'ok').length}</strong> require attention.</p>`;
    html += `<table><thead><tr><th>Acronym</th><th>Source</th><th>Definition</th><th>Status</th><th>Note</th></tr></thead><tbody>`;
    acronyms.forEach(a => {
        html += `<tr><td><strong>${a.acr}</strong></td><td>${a.source}</td><td>${a.def}</td><td><span class="acr-status ${statusClass[a.status]}">${statusLabel[a.status]}</span></td><td>${a.note}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('acronyms-output').innerHTML = html;
}

// ===== TEST PLAN =====
function renderTestPlan() {
    const tests = [
        { id: 'TC-BC-001', desc: 'VIN eligibility — Search eligible VIN via HUB bar', pre: 'AR logged in with SA; VIN eligible in HUB', steps: '1. Enter eligible VIN\n2. Click Search', expected: 'Vehicle Landing page opens. BrandCare contracts displayed.' },
        { id: 'TC-BC-002', desc: 'VIN eligibility — Create new folder', pre: 'Same as TC-001', steps: '1. Click New Folder\n2. Enter VIN\n3. Save', expected: 'Customer-Vehicle page updated. HUB status = 1.' },
        { id: 'TC-BC-003', desc: 'VIN eligibility — Change VIN in folder', pre: 'Existing folder open', steps: '1. Change VIN\n2. Save', expected: 'New eligibility fetched from HUB.' },
        { id: 'TC-BC-004', desc: 'Non-eligible VIN (Level 1/2 fail)', pre: 'VIN fails HUB check', steps: '1. Enter VIN\n2. Search', expected: 'No BrandCare data displayed.' },
        { id: 'TC-BC-005', desc: 'Landing from external app', pre: 'External app with VIN', steps: '1. Click basket icon', expected: 'BrandCare contracts displayed.' },
        { id: 'TC-BC-006', desc: 'VIS entered (resolved to VIN)', pre: 'VIS entered', steps: '1. Create folder with VIS', expected: 'PANIER resolves to VIN via CIN/CORVET.' },
        { id: 'TC-BC-007', desc: 'Workline — designated SC code', pre: 'Eligible VIN folder', steps: '1. Enter SC code\n2. Allocation=Manufacturer\n3. Save', expected: 'Workline created for BrandCare.' },
        { id: 'TC-BC-008', desc: 'Workline — non-designated code', pre: 'Eligible VIN', steps: '1. Enter non-SC code\n2. Save', expected: 'No BrandCare checkbox on DMS.' },
        { id: 'TC-BC-009', desc: 'FDZ/MenuPricing package with SC code', pre: 'Package has SC code', steps: '1. Add package', expected: 'Workline auto-created for BrandCare.' },
        { id: 'TC-BC-010', desc: 'DMS — checkbox shown (all criteria met)', pre: 'All 6 criteria satisfied', steps: '1. Navigate to DMS Transfer', expected: 'BrandCare checkbox enabled.' },
        { id: 'TC-BC-011', desc: 'DMS — VIN not eligible', pre: 'HUB status ≠ 1', steps: '1. Go to DMS Transfer', expected: 'No BrandCare column.' },
        { id: 'TC-BC-012', desc: 'DMS — CARE_PROGRAM not assigned', pre: 'Characteristic missing', steps: '1. Go to DMS Transfer', expected: 'No BrandCare column.' },
        { id: 'TC-BC-013', desc: 'DMS — SA not assigned', pre: 'User lacks SA', steps: '1. Go to DMS Transfer', expected: 'No BrandCare column.' },
        { id: 'TC-BC-014', desc: 'DMS — Allocation=Internal/Customer', pre: 'Wrong allocation type', steps: '1. Go to DMS Transfer', expected: 'No BrandCare column.' },
        { id: 'TC-BC-015', desc: 'Reception brand ≠ VIN brand', pre: 'AGENDA folder, different brand', steps: '1. Enter VIN\n2. Save', expected: 'Warning message. No checkbox.' },
        { id: 'TC-BC-016', desc: 'AR changes reception brand', pre: 'Folder with eligible VIN', steps: '1. Change brand\n2. Save', expected: 'Warning displayed. No checkbox.' },
        { id: 'TC-BC-017', desc: 'Mandatory params missing', pre: 'Criteria met but params incomplete', steps: '1. Go to DMS Transfer', expected: 'Checkbox greyed out. Orange bar.' },
        { id: 'TC-BC-018', desc: 'BCF transfer — success', pre: 'All ready', steps: '1. Select checkbox\n2. Transfer\n3. Click BCF button', expected: 'Data sent to DMBR. New tab opens.' },
        { id: 'TC-BC-019', desc: 'BCF transfer — DMS fails', pre: 'DMS error', steps: '1. Transfer fails', expected: 'BCF button greyed out with tooltip.' },
        { id: 'TC-BC-020', desc: 'BCF transfer — missing params', pre: 'DMS OK but params missing', steps: '1. View results', expected: 'Orange bar message. Button greyed.' },
        { id: 'TC-BC-021', desc: 'Multiple worklines — partial transfer', pre: 'Two BC worklines', steps: '1. Transfer & Keep first\n2. Transfer second', expected: 'Each transferred independently.' },
        { id: 'TC-BC-022', desc: 'HUB no response', pre: 'HUB down', steps: '1. Enter VIN', expected: 'VIN treated as ineligible.' },
        { id: 'TC-BC-023', desc: 'SAGAI unavailable', pre: 'SAGAI down', steps: '1. Open folder', expected: '"SAGAI not available" message.' },
        { id: 'TC-BC-024', desc: 'JWT authentication', pre: 'OAuth 2.0 configured', steps: '1. Click BCF button\n2. Check request', expected: 'JWT token in header.' },
        { id: 'TC-BC-025', desc: 'Independent Repairer blocked', pre: 'Non-AR user', steps: '1. Navigate to PANIER', expected: 'No BrandCare features.' },
    ];

    let html = `<p style="margin-bottom:16px;font-size:.9rem;"><strong>${tests.length}</strong> test cases generated from DFS CAP-37495 / PNR-10279.</p>`;
    html += `<table><thead><tr><th style="width:95px">Test ID</th><th style="width:200px">Description</th><th>Preconditions</th><th>Steps</th><th>Expected Result</th></tr></thead><tbody>`;
    tests.forEach(t => {
        html += `<tr><td class="tp-id">${t.id}</td><td>${t.desc}</td><td>${t.pre}</td><td>${t.steps.replace(/\n/g, '<br>')}</td><td>${t.expected}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('testplan-output').innerHTML = html;
}

// ===== KNOW-HOW (same as before, abbreviated) =====
function renderKnowHow() {
    document.getElementById('knowhow-output').innerHTML = `
<h4>1. Business Context</h4>
<div class="kh-card">
    <h5>Allure Care Program (BrandCare)</h5>
    <p>Warranty Extension program launched Feb 2024 for Peugeot in G10 EU markets. Extends to Citroën, Opel, DS.</p>
    <ul><li><strong>Peugeot:</strong> Peugeot Care</li><li><strong>Citroën:</strong> Citroën We Care</li><li><strong>DS:</strong> DS Serenity</li><li><strong>Opel:</strong> Opel 8Y Warranty</li></ul>
</div>
<h4>2. Eligibility Rules</h4>
<div class="kh-card">
    <h5>VIN Eligibility (HUB Check)</h5>
    <ul><li>PANIER sends VINs to HUB for eligibility</li><li>HUB performs Level 1 + Level 2 checks</li><li>Status = 1 → eligible</li><li>No response → ineligible</li><li>Returns: Contribution Flag, Engine Type (BEV/NON-BEV), Vehicle Type (PC/LCV)</li></ul>
</div>
<div class="kh-card">
    <h5>Workline Transfer (6 Conditions)</h5>
    <ul><li>VIN eligible (HUB Status = 1)</li><li>CARE_PROGRAM assigned to dealer RRDI of Reception brand</li><li>Reception brand = VIN brand</li><li>User has BrandCare SA</li><li>Workline has designated SC code</li><li>Allocation Type = "Manufacturer"</li></ul>
</div>
<h4>3. Key Workflows</h4>
<div class="kh-card">
    <h5>VIN Check → Workline → Transfer Flow</h5>
    <ul><li><strong>VIN Check:</strong> PANIER → HUB → eligibility status returned</li><li><strong>Workline:</strong> AR creates with SC code + Manufacturer allocation</li><li><strong>DMS Transfer:</strong> Checkbox appears if all 6 criteria met</li><li><strong>BCF Transfer:</strong> JWT token → DMBR → new tab opens</li></ul>
</div>
<h4>4. System Interactions</h4>
<div class="kh-card">
    <h5>Integration Map</h5>
    <ul><li><strong>PANIER ↔ HUB:</strong> VIN eligibility</li><li><strong>PANIER → DMBR:</strong> Workline + folder via JWT</li><li><strong>PANIER ↔ BRR:</strong> Dealer characteristics (PDVINFO)</li><li><strong>PANIER ← CEM/SAGAI:</strong> Contract info</li><li><strong>PANIER ↔ CIN:</strong> VIN/VIS resolution</li></ul>
</div>
<h4>5. Error Messages</h4>
<div class="kh-card">
    <ul><li><strong>Brand mismatch:</strong> "Reception Brand is different from the VIN brand..."</li><li><strong>DMS failed:</strong> "Workline cannot be transferred... as DMS is not successful"</li><li><strong>Missing param:</strong> "[XXXX] parameter is missing..."</li><li><strong>SAGAI down:</strong> "SAGAI not available"</li></ul>
    <p><em>All messages translatable in all PANIER languages.</em></p>
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
        const html = document.getElementById('comm-output').innerHTML;
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AllureCare Communication</title>
<style>body{font-family:Calibri,sans-serif;padding:40px 60px;font-size:11pt;line-height:1.6;color:#333}
h4{color:#1B2A4A;font-size:13pt;margin:18px 0 8px}table{width:100%;border-collapse:collapse}
th{background:#1B2A4A;color:#fff;padding:8px 10px;text-align:left;font-size:10pt}
td{padding:8px 10px;border-bottom:1px solid #ddd;font-size:10pt}
.comm-header-block{background:#f5f5f5;border-left:4px solid #1B2A4A;padding:14px 18px;margin-bottom:18px}
.highlight-box{background:#FFF3E0;border-left:4px solid #E65100;padding:12px 16px;margin:14px 0;font-weight:600}
.training-box{background:#E3F2FD;border-left:4px solid #1976D2;padding:12px 16px;margin:14px 0}
ul{padding-left:18px}li{margin-bottom:4px}
.word-image-placeholder{background:#f9f9f9;border:2px dashed #ccc;padding:20px;text-align:center;margin:14px 0;color:#999;font-size:10pt}
</style></head><body>${html}</body></html>`;

        const blob = new Blob([fullHtml], { type: 'application/vnd.ms-word' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'AllureCare_Communication_' + currentLang.toUpperCase() + '.doc';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btn-pdf-comm').addEventListener('click', () => { window.print(); });

    document.getElementById('btn-export-tp').addEventListener('click', () => {
        const html = document.getElementById('testplan-output').innerHTML;
        const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Test Plan</title><style>body{font-family:Calibri,sans-serif;padding:40px;font-size:10pt}table{width:100%;border-collapse:collapse}th{background:#1B2A4A;color:#fff;padding:8px}td{padding:8px;border-bottom:1px solid #ddd}</style></head><body>${html}</body></html>`], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'AllureCare_TestPlan.html'; a.click();
        URL.revokeObjectURL(url);
    });
}
