(function enforcePortalSecurityGate() {
    const isSessionValid = sessionStorage.getItem('isAdminAuthenticated') === 'true';
    const isPermanentValid = localStorage.getItem('isAdminAuthenticated') === 'true';
    
    if (!isSessionValid && !isPermanentValid) {
        window.location.replace("login.html");
    }
})();

const API_BASE = 'http://localhost:3000/api';
let activeTable = 'member'; 
let workingRecordId = null; 

// Global State Tracking Variables for Multi-Step Transaction Flow Mechanisms
let isWizardMode = false;
const wizardSteps = ['member', 'contact', 'employment', 'prevemployment', 'heir', 'governmentid'];
let wizardCurrentStepIndex = 0;
let wizardPrimaryTrackingKey = null; 
let interruptedWizardState = null;   

// Dynamic Multiplier Matrix: Tracks how many input sets to clone on array steps
let wizardStepRowMultipliers = {
    employment: 1,
    prevemployment: 1,
    heir: 1
};

// Caches EVERY single step locally until the final submission commit
let wizardMultiEntryStore = {
    member: null,
    contact: null,
    employment: [],
    prevemployment: [],
    heir: []
};

// Programmatic mappings linking dynamic user inputs directly to file column keys
const tableStructures = {
    member: ['Pagibig_ID', 'Regis_num', 'Occ_Stats', 'First_time', 'Mem_Type', 'Mem_Subtype', 'Type_Work', 'Type_Country', 'Mem_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'MemCert_Name', 'Birth_Date', 'Place_Birth', 'Sex', 'Height', 'Weight', 'Marital_Status', 'Citizenship', 'Facial_Features', 'Frequency_Payment'],
    contact: ['Pagibig_ID', 'Cell_Num', 'Home_Num', 'Business_Direct', 'Business_Trunk', 'Email_Address', 'Perm_Address', 'Present_Address', 'Pref_Mail_Address'],
    employment: ['Pagibig_ID', 'Employer_ID', 'Employment_Status', 'Occupation', 'Office_Assignment', 'Date_Employed', 'Monthly_Income'],
    prevemployment: ['Pagibig_ID', 'Employer_ID', 'Date_From', 'Date_To', 'PrevOffice_Assignment'], 
    heir: ['Pagibig_ID', 'Heir_Code', 'Heir_Name', 'Relationship', 'Heir_DateBirth'],                     
    governmentid: ['Pagibig_ID', 'TIN_Num', 'SSS_Num', 'CRN', 'EM_Num', 'AFP_PNP_Num', 'Deped_Code'],     
    employer: ['Employer_ID', 'Employer_Name', 'Employer_Address']                                      
};

// Required fields configuration framework for wizard and standalone evaluations
const requiredFieldsConfig = {
    member: ['Pagibig_ID', 'Regis_num', 'Occ_Stats', 'First_time', 'Mem_Type', 'Mem_Subtype', 'Mem_Name', 'Mot_Name', 'Birth_Date', 'Place_Birth', 'Sex', 'Marital_Status', 'Citizenship'],
    contact: ['Pagibig_ID', 'Cell_Num', 'Perm_Address', 'Present_Address', 'Pref_Mail_Address'],
    employment: ['Pagibig_ID', 'Employer_ID', 'Employment_Status', 'Occupation', 'Office_Assignment', 'Date_Employed', 'Monthly_Income'],
    prevemployment: ['Pagibig_ID', 'Employer_ID', 'Date_From', 'Date_To', 'PrevOffice_Assignment'],
    heir: ['Pagibig_ID', 'Heir_Code', 'Heir_Name', 'Relationship', 'Heir_DateBirth'],
    governmentid: [],
    employer: ['Employer_ID', 'Employer_Name', 'Employer_Address']
};

const primaryKeyTracker = {
    member: ['Pagibig_ID'], contact: ['Pagibig_ID'], employment: ['Pagibig_ID'],
    governmentid: ['Pagibig_ID'], employer: ['Employer_ID'],
    prevemployment: ['Pagibig_ID', 'Employer_ID'],
    heir: ['Pagibig_ID', 'Heir_Code']
};

// ── FILTER FIELD DEFINITIONS ──────────────────────────────────────────────────
// Mirrors the exact input types / options used in the add-member form.
// type: 'select' | 'radio' | 'date-range' | 'text' (default)
const FILTER_FIELD_DEFINITIONS = {
    // member
    Occ_Stats:          { type: 'select',     options: ['UNEMPLOYED/NOT YET EMPLOYED', 'EMPLOYED'] },
    First_time:         { type: 'radio',      options: ['YES', 'NO'] },
    Mem_Type:           { type: 'select',     options: ['MANDATORY', 'VOLUNTARY'] },
    Mem_Subtype:        { type: 'select',     options: ['EMPLOYED', 'OVERSEAS FILIPINO WORKER (OFW)', 'SELF-EMPLOYED', 'INDIVIDUAL PAYOR', 'OTHERS'] },
    Type_Work:          { type: 'select',     options: ['Land-based', 'Sea-based'] },
    Sex:                { type: 'radio',      options: ['M', 'F'] },
    Marital_Status:     { type: 'select',     options: [
                            { value: 'S', label: 'Single / Unmarried' },
                            { value: 'W', label: 'Widow / er' },
                            { value: 'A', label: 'Annulled' },
                            { value: 'M', label: 'Married' },
                            { value: 'LS', label: 'Legally Separated' }
                         ]},
    Frequency_Payment:  { type: 'select',     options: ['Monthly', 'Quarterly'] },
    Birth_Date:         { type: 'date-range' },
    // contact
    Pref_Mail_Address:  { type: 'select',     options: ['Present Home Address', 'Permanent Home Address', 'Employer/Business Address'] },
    // employment
    Employment_Status:  { type: 'select',     options: ['Permanent/Regular', 'Casual', 'Contractual', 'Project-based', 'Part-time/Temporary'] },
    Office_Assignment:  { type: 'select',     options: ['Head Office', 'Branch Office'] },
    Date_Employed:      { type: 'date-range' },
    // prevemployment
    PrevOffice_Assignment: { type: 'select',  options: ['Head Office', 'Branch Office'] },
    Date_From:          { type: 'date-range' },
    Date_To:            { type: 'date-range' },
    // heir
    Heir_DateBirth:     { type: 'date-range' },
};

let activeFilters = {}; // { col: { type, value, valueTo? } }

window.addEventListener('DOMContentLoaded', () => {
    buildFormWorkspace();
    fetchLedgerRecords();
});

function changeWorkspaceTable(tableKey, menuRef) {
    activeTable = tableKey;
    document.querySelectorAll('#table-tabs li').forEach(el => el.classList.remove('selected'));
    menuRef.classList.add('selected');

    // ── 🏷️ METADATA MAPPING MATCHING YOUR EXACT ACCESSIBLE KEYS ──
    const tableNamingMap = {
        member: { main: "Member Information", sql: "member" },
        contact: { main: "Contact Details", sql: "contact" },
        employment: { main: "Current Employment", sql: "employment" },
        prevemployment: { main: "Previous Employment", sql: "prevemployment" },
        heir: { main: "Beneficiary Registry", sql: "heir" },
        governmentid: { main: "Government IDs", sql: "governmentid" },
        employer: { main: "Employer Registry", sql: "employer" }
    };

    const currentNaming = tableNamingMap[tableKey] || { main: tableKey, sql: tableKey };

    // Update main text title header element
    document.getElementById('active-title').innerText = currentNaming.main;
    
    // Smoothly apply the gray folder path style with your exact blue SQL name popout
    const breadcrumbContainer = document.querySelector('.breadcrumbs');
    if (breadcrumbContainer) {
        breadcrumbContainer.innerHTML = `
            <span style="color: var(--slate-text-light);">Database / Tables / <span id="breadcrumb-sub" style="color: var(--pagibig-blue); font-weight: 600;">${currentNaming.sql}</span></span>
        `;
    }
    
    clearFormCache();
    buildFormWorkspace();
    fetchLedgerRecords();
    activeFilters = {};
    const panel = document.getElementById('filter-panel');
    if (panel) panel.classList.add('hidden');
    buildFilterPanel();

    const searchInput = document.getElementById('ledger-search-input');
    if (searchInput) searchInput.value = '';
}

function initiateNewMemberWizard() {
    isWizardMode = true;
    wizardCurrentStepIndex = 0;
    wizardPrimaryTrackingKey = null;
    interruptedWizardState = null;
    
    wizardStepRowMultipliers = { employment: 1, prevemployment: 1, heir: 1 };
    wizardMultiEntryStore.member = null;
    wizardMultiEntryStore.contact = null;
    wizardMultiEntryStore.employment = [];
    wizardMultiEntryStore.prevemployment = [];
    wizardMultiEntryStore.heir = [];
    wizardMultiEntryStore.governmentid = null;
    
    activeTable = wizardSteps[wizardCurrentStepIndex];
    workingRecordId = null;
    
    document.getElementById('modal-title-intent').innerText = "Step 1: Account Identification Registration (Member Profile)";
    openCrudModal();
    buildFormWorkspace();
}

function clearFormCache() {
    workingRecordId = null;
    if (!isWizardMode) {
        isWizardMode = false;
        wizardPrimaryTrackingKey = null;
        interruptedWizardState = null;
        wizardStepRowMultipliers = { employment: 1, prevemployment: 1, heir: 1 };
        wizardMultiEntryStore.member = null;
        wizardMultiEntryStore.contact = null;
        wizardMultiEntryStore.employment = [];
        wizardMultiEntryStore.prevemployment = [];
        wizardMultiEntryStore.heir = [];
        wizardMultiEntryStore.governmentid = null;
    }
}

function terminateWizardSession() {
    isWizardMode = false;
    wizardPrimaryTrackingKey = null;
    interruptedWizardState = null;
    closeCrudModal();
}

function injectWizardProgressIndicator() {
    const box = document.getElementById('form-grid-target');
    
    let progressHtml = `<div class="wizard-progress-bar">`;
    wizardSteps.forEach((step, idx) => {
        let statusClass = 'wizard-step-indicator';
        let icon = 'circle'; 
        
        if (idx === wizardCurrentStepIndex) {
            statusClass += ' active-step';
            icon = 'radio_button_unchecked'; 
        } else if (idx < wizardCurrentStepIndex) {
            statusClass += ' completed-step';
            icon = 'check'; 
        }
        
        let stepLabel = step;
        if (step === 'prevemployment') stepLabel = 'Prev Job';
        if (step === 'governmentid') stepLabel = 'Gov IDs';
        
        progressHtml += `
            <div class="${statusClass}">
                <div class="step-icon-wrapper">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <span class="step-label-text">${stepLabel}</span>
            </div>`;
    });
    progressHtml += `</div>`;
    
    box.innerHTML = progressHtml + box.innerHTML;
}

function suspendWizardForEmployerFiling() {
    interruptedWizardState = {
        wizardCurrentStepIndex: wizardCurrentStepIndex,
        wizardPrimaryTrackingKey: wizardPrimaryTrackingKey,
        cachedFormData: {}
    };
    
    const totalMultipliers = wizardStepRowMultipliers[activeTable] || 1;
    for (let index = 0; index < totalMultipliers; index++) {
        tableStructures[activeTable].forEach(attr => {
            const domId = totalMultipliers === 1 ? `attr-${attr}` : `attr-${attr}-${index}`;
            const field = document.getElementById(domId);
            if (field) {
                interruptedWizardState.cachedFormData[domId] = field.value;
            } else if (['First_time', 'Sex'].includes(attr)) {
                const checkedRadio = document.querySelector(`input[name="name-${domId}"]:checked`);
                if (checkedRadio) interruptedWizardState.cachedFormData[domId] = checkedRadio.value;
            }
        });
    }
    
    isWizardMode = false;
    activeTable = 'employer';
    workingRecordId = null;
    
    document.querySelectorAll('#table-tabs li').forEach(el => {
        if(el.innerText.includes('Employer')) el.classList.add('selected');
        else el.classList.remove('selected');
    });
    
    document.getElementById('modal-title-intent').innerText = "Interrupted Step Path: Provision New Employer Reference Key";
    buildFormWorkspace();
}

async function buildFormWorkspace() {
    const box = document.getElementById('form-grid-target');
    box.innerHTML = '';
    
    const isNewRecord = workingRecordId === null;
    
    let nextEmployerId = '';
    if (activeTable === 'employer' && isNewRecord) {
        try {
            const response = await fetch(`${API_BASE}/table/employer`);
            const rows = await response.json();
            let highestNum = 0;
            rows.forEach(r => {
                const match = (r.Employer_ID || '').match(/^E(\d+)$/i);
                if (match) highestNum = Math.max(highestNum, parseInt(match[1], 10));
            });
            nextEmployerId = `E${String(highestNum + 1).padStart(3, '0')}`;
        } catch(e) { nextEmployerId = 'E001'; }
    }

    let employerOptionsHtml = '<option value="" selected disabled>-- Select Registered Employer --</option>';
    if (['employment', 'prevemployment'].includes(activeTable)) {
        try {
            const response = await fetch(`${API_BASE}/table/employer`);
            const employers = await response.json();
            employers.forEach(emp => {
                employerOptionsHtml += `<option value="${emp.Employer_ID}">${emp.Employer_Name} (${emp.Employer_ID})</option>`;
            });
        } catch (err) { console.error(err); }
    }

    const renderLimitCount = isWizardMode ? (wizardStepRowMultipliers[activeTable] || 1) : 1;

    for (let entryIndex = 0; entryIndex < renderLimitCount; entryIndex++) {
        
        if (renderLimitCount > 1) {
            let sectionLabel = activeTable === 'heir' ? `Beneficiary Profile #${entryIndex + 1}` : `Employment Entry Record #${entryIndex + 1}`;
            
            let deleteSectionButtonHtml = entryIndex > 0 
                ? `<button type="button" class="btn-divider-delete" onclick="evictWizardRowSetFields('${activeTable}', ${entryIndex})" title="Remove this entire row block">
                       <span class="material-symbols-outlined">delete</span> Delete Section
                   </button>`
                : '';

            box.innerHTML += `
                <div class="multiplier-row-divider alignment-split-header">
                    <div class="notice-left-content" style="gap: 8px;">
                        <span class="material-symbols-outlined">layers</span>
                        <h4>${sectionLabel}</h4>
                    </div>
                    ${deleteSectionButtonHtml}
                </div>`;
        }

        let nextHeirCode = `H${String(1 + entryIndex).padStart(3, '0')}`;
        if (activeTable === 'heir' && isNewRecord) {
            try {
                const response = await fetch(`${API_BASE}/table/heir`);
                const rows = await response.json();
                let highestHeirNum = 0;
                rows.forEach(r => {
                    const match = (r.Heir_Code || '').match(/^H(\d+)$/i);
                    if (match) highestHeirNum = Math.max(highestHeirNum, parseInt(match[1], 10));
                });
                nextHeirCode = `H${String(highestHeirNum + 1 + entryIndex).padStart(3, '0')}`;
            } catch(e) {}
        }

        tableStructures[activeTable].forEach(attr => {
            if (attr === 'id') return;
            let labelName = attr.replace(/_/g, ' ');
            let inputHtml = '';
            
            const isRequired = requiredFieldsConfig[activeTable].includes(attr);
            const requiredAsterisk = isRequired ? ' <span class="required-asterisk">*</span>' : '';
            
            const targetDOMId = renderLimitCount === 1 ? `attr-${attr}` : `attr-${attr}-${entryIndex}`;

            switch (attr) {
                case 'Occ_Stats':
                    inputHtml = `<select id="${targetDOMId}"><option value="" selected disabled>-- Select Status --</option><option value="UNEMPLOYED/NOT YET EMPLOYED">UNEMPLOYED / NOT YET EMPLOYED</option><option value="EMPLOYED">EMPLOYED</option></select>`;
                    break;
                case 'First_time':
                    inputHtml = `
                        <div class="radio-group-container">
                            <label class="radio-inline-label"><input type="radio" name="name-${targetDOMId}" id="${targetDOMId}-YES" value="YES"> YES</label>
                            <label class="radio-inline-label"><input type="radio" name="name-${targetDOMId}" id="${targetDOMId}-NO" value="NO"> NO</label>
                        </div>`;
                    break;
                case 'Mem_Type':
                    inputHtml = `<select id="${targetDOMId}" onchange="evaluateSubtypeConditionalDropdowns(this.value)"><option value="" selected disabled>-- Select Membership Type --</option><option value="MANDATORY">MANDATORY</option><option value="VOLUNTARY">VOLUNTARY</option></select>`;
                    break;
                case 'Mem_Subtype':
                    inputHtml = `
                        <div id="subtype-conditional-wrapper">
                            <select id="${targetDOMId}" onchange="evaluateSubtypeConditionalDropdowns(document.getElementById('attr-Mem_Type').value); evaluateOfwFieldsVisibility(this.value);">
                                <option value="" selected disabled>-- Select Membership Type First --</option>
                            </select>
                        </div>`;
                    break;
                case 'Type_Work':
                    inputHtml = `
                        <select id="${targetDOMId}">
                            <option value="" selected disabled>-- Select Type of Work --</option>
                            <option value="Land-based">Land-based</option>
                            <option value="Sea-based">Sea-based</option>
                        </select>`;
                    break;
                case 'Type_Country':
                    inputHtml = `<input type="text" id="${targetDOMId}" maxlength="30" placeholder="e.g. SINGAPORE" autocomplete="off">`;
                    break;
                case 'Sex':
                    inputHtml = `
                        <div class="radio-group-container">
                            <label class="radio-inline-label"><input type="radio" name="name-${targetDOMId}" id="${targetDOMId}-M" value="M"> M</label>
                            <label class="radio-inline-label"><input type="radio" name="name-${targetDOMId}" id="${targetDOMId}-F" value="F"> F</label>
                        </div>`;
                    break;
                case 'Marital_Status':
                    inputHtml = `<select id="${targetDOMId}"><option value="" selected disabled>-- Select Marital Status --</option><option value="S">Single / Unmarried</option><option value="W">Widow / er</option><option value="A">Annulled</option><option value="M">Married</option><option value="LS">Legally Separated</option></select>`;
                    break;
                case 'Frequency_Payment':
                    inputHtml = `<select id="${targetDOMId}"><option value="" selected disabled>-- Select Frequency --</option><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option></select>`;
                    break;
                case 'Pref_Mail_Address':
                    inputHtml = `<select id="${targetDOMId}"><option value="" selected disabled>-- Select Preferred Address --</option><option value="Present Home Address">Present Home Address</option><option value="Permanent Home Address">Permanent Home Address</option><option value="Employer/Business Address">Employer / Business Address</option></select>`;
                    break;
                case 'Employer_ID':
                    if (['employment', 'prevemployment'].includes(activeTable)) {
                        inputHtml = `<select id="${targetDOMId}">${employerOptionsHtml}</select>`;
                    } else if (activeTable === 'employer') {
                        inputHtml = `<input type="text" id="${targetDOMId}" value="${isNewRecord ? nextEmployerId : ''}" disabled>`;
                    }
                    break;
                case 'Employment_Status':
                    inputHtml = `<select id="${targetDOMId}"><option value="" selected disabled>-- Select Employment Status --</option><option value="Permanent/Regular">Permanent / Regular</option><option value="Casual">Casual</option><option value="Contractual">Contractual</option><option value="Project-based">Project-based</option><option value="Part-time/Temporary">Part-time / Temporary</option></select>`;
                    break;
                case 'Office_Assignment':
                case 'PrevOffice_Assignment':
                    inputHtml = `<select id="${targetDOMId}"><option value="" selected disabled>-- Select Office Assignment --</option><option value="Head Office">Head Office</option><option value="Branch Office">Branch Office</option></select>`;
                    break;
                case 'Heir_Code':
                    inputHtml = `<input type="text" id="${targetDOMId}" value="${isNewRecord ? nextHeirCode : ''}" disabled>`;
                    break;
                default:
                    let inputType = 'text';
                    let extraAttributes = '';
                    let placeholderText = '';
                    const numericColumns = ['Pagibig_ID', 'Regis_num', 'Height', 'Weight', 'Monthly_Income', 'TIN_Num', 'SSS_Num', 'CRN', 'EM_Num', 'AFP_PNP_Num', 'Deped_Code'];
                    const dateColumns = ['Birth_Date', 'Date_Employed', 'Date_From', 'Date_To', 'Heir_DateBirth'];

                    if (numericColumns.includes(attr)) inputType = 'number';
                    if (dateColumns.includes(attr)) {
                        inputType = 'date';
                        // Dynamically calculate today's ISO date string (YYYY-MM-DD)
                        const todayISO = new Date().toISOString().split('T')[0];
                        extraAttributes += ` max="${todayISO}"`;
                    }

                    if (['Mem_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'MemCert_Name', 'Heir_Name'].includes(attr)) {
                        placeholderText = 'LAST NAME, FIRST NAME MIDDLE NAME';
                    } else if (['Cell_Num', 'Home_Num', 'Business_Direct', 'Business_Trunk'].includes(attr)) {
                        placeholderText = '+63 XXX XXXX XXX';
                    }

                    if (inputType === 'text') {
                        if (attr !== 'Pagibig_ID') {
                            extraAttributes = `placeholder="${placeholderText}"`;
                        }
                        if (['Mem_Name', 'MemCert_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'Heir_Name', 'Employer_Name'].includes(attr)) {
                            extraAttributes += ' maxlength="50"'; 
                        } else if (['Place_Birth', 'Perm_Address', 'Present_Address', 'Employer_Address'].includes(attr)) {
                            extraAttributes += ' maxlength="80"'; 
                        } else if (attr === 'Facial_Features') {
                            extraAttributes += ' maxlength="50"';
                        } else if (attr === 'Type_Country') {
                            extraAttributes += ' maxlength="30"'; 
                        } else if (attr === 'Cell_Num') {
                            extraAttributes += ' maxlength="16"'; 
                        } else if (['Home_Num', 'Business_Direct', 'Business_Trunk', 'Relationship'].includes(attr)) {
                            extraAttributes += ' maxlength="15"'; 
                        }
                    } else if (inputType === 'number') {
                        if (['Pagibig_ID', 'Regis_num', 'CRN', 'EM_Num'].includes(attr)) extraAttributes = 'oninput="if(this.value.length > 12) this.value = this.value.slice(0, 12);"'; 
                        else if (attr === 'TIN_Num') extraAttributes = 'oninput="if(this.value.length > 9) this.value = this.value.slice(0, 9);"';
                        else if (attr === 'SSS_Num') extraAttributes = 'oninput="if(this.value.length > 11) this.value = this.value.slice(0, 11);"'; 
                        else if (['Height', 'Weight'].includes(attr)) extraAttributes = 'oninput="if(this.value.length > 3) this.value = this.value.slice(0, 3);"'; 
                        else if (['AFP_PNP_Num', 'Deped_Code'].includes(attr)) extraAttributes = 'oninput="if(this.value.length > 6) this.value = this.value.slice(0, 6);"'; 
                    }

                    inputHtml = `<input type="${inputType}" id="${targetDOMId}" ${extraAttributes} autocomplete="off">`;
                    break;
            }

            let wrapperIdHtml = '';
            if (attr === 'Type_Work' || attr === 'Type_Country') {
                wrapperIdHtml = ` id="grid-row-wrapper-${attr}" style="display: none;"`;
            }

            box.innerHTML += `
                <div${wrapperIdHtml}>
                    <label for="${targetDOMId}">${labelName}${requiredAsterisk}</label>
                    ${inputHtml}
                </div>`;
        });
    }

    if (activeTable === 'contact') {
        const addressMirrorCheckboxHtml = `
            <div style="grid-column: span 2; flex-direction: row !important; align-items: center; gap: 8px; margin: -4px 0 6px 0;">
                <input type="checkbox" id="sync-present-address-checkbox" style="width: auto; cursor: pointer;" onchange="toggleAddressMirrorSynchronization(this)">
                <label for="sync-present-address-checkbox" style="margin: 0; text-transform: none; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--slate-text-light);">
                    Present Address is the same as Permanent Home Address
                </label>
            </div>`;
        const presentAddrField = document.getElementById('attr-Present_Address').parentElement;
        presentAddrField.insertAdjacentHTML('beforebegin', addressMirrorCheckboxHtml);
        
        const permAddrInput = document.getElementById('attr-Perm_Address');
        if (permAddrInput) {
            permAddrInput.addEventListener('input', () => {
                const cb = document.getElementById('sync-present-address-checkbox');
                if (cb && cb.checked) {
                    document.getElementById('attr-Present_Address').value = permAddrInput.value;
                }
            });
        }
    }

    // ==========================================================================
    // 🔒 TIMELINE STEPPER FOOTER MANAGEMENT LAYERS
    // ==========================================================================
    if (isWizardMode) {
        injectWizardProgressIndicator();
        
        if (['employment', 'prevemployment'].includes(activeTable)) {
            const topNoticeHtml = `
                <div class="wizard-top-notice-banner">
                    <div class="notice-left-content">
                        <span class="material-symbols-outlined">corporate_fare</span>
                        <span>Can't find the registered business listed in the drop-down selector?</span>
                    </div>
                    <button type="button" class="btn-primary flex-center" onclick="suspendWizardForEmployerFiling()">
                        <span class="material-symbols-outlined">add</span> Input New Employer
                    </button>
                </div>`;
            const progressBarElement = box.querySelector('.wizard-progress-bar');
            if (progressBarElement) {
                progressBarElement.insertAdjacentHTML('afterend', topNoticeHtml);
            }
        }
        
        let wizardFooterActionsHtml = '';
        if (['employment', 'prevemployment'].includes(activeTable)) {
            wizardFooterActionsHtml += `
                <div class="wizard-array-actions-block">
                    <button type="button" class="btn-secondary" onclick="incrementWizardFormRowFields('${activeTable}')">+ Cache & Add Another Job</button>
                </div>`;
        } else if (activeTable === 'heir') {
            wizardFooterActionsHtml += `
                <div class="wizard-array-actions-block">
                    <button type="button" class="btn-secondary" onclick="incrementWizardFormRowFields('heir')">+ Cache & Add Another Beneficiary</button>
                </div>`;
        }
        
        if (wizardFooterActionsHtml) {
            box.insertAdjacentHTML('beforeend', `<div style="grid-column: span 2; margin-top: 10px;">${wizardFooterActionsHtml}</div>`);
        }

        const modalFooter = document.querySelector('.modal-footer');
        if (modalFooter) {
            const optionalTables = ['employment', 'prevemployment', 'governmentid'];
            const isCurrentStepOptional = optionalTables.includes(activeTable);
            
            let skipButtonHtml = isCurrentStepOptional 
                ? `<button class="btn-danger" style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fca5a5;" onclick="bypassOptionalWizardSegment('${activeTable}')">Skip Step</button>` 
                : '';

            if (wizardCurrentStepIndex > 0) {
                modalFooter.innerHTML = `
                    <button class="btn-secondary" onclick="closeCrudModal()">Cancel</button>
                    <button class="btn-secondary" style="margin-right: auto;" onclick="advanceWizardStepEngine('prev')">← Back</button>
                    ${skipButtonHtml}
                    <button class="btn-primary" onclick="commitSaveTransaction()">Next Step →</button>
                `;
            } else {
                modalFooter.innerHTML = `
                    <button class="btn-secondary" onclick="closeCrudModal()">Cancel</button>
                    ${skipButtonHtml}
                    <button class="btn-primary" onclick="commitSaveTransaction()">Next Step →</button>
                `;
            }
        }

        const nextButton = document.querySelector('.modal-footer .btn-primary');
        if (nextButton) {
            nextButton.innerText = (wizardCurrentStepIndex === wizardSteps.length - 1) ? "Finish & Save" : "Next Step →";
        }
    } else if (activeTable === 'employer' && interruptedWizardState !== null) {
        const modalFooter = document.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button class="btn-secondary" onclick="cancelEmployerFilingAndReturn()">Cancel</button>
                <button class="btn-primary" onclick="commitSaveTransaction()">Commit Employer & Return</button>
            `;
        }
    } else {
        const modalFooter = document.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button class="btn-secondary" onclick="closeCrudModal()">Cancel</button>
                <button class="btn-primary" onclick="commitSaveTransaction()">Save Changes</button>
            `;
        }
    }

    // SAFE DATA RESTORATION FOR SINGLE-OR-MULTIPLIED NODES
    if (isWizardMode) {
        try {
            const stepCacheData = wizardMultiEntryStore[activeTable];
            if (stepCacheData) {
                const isArrayData = Array.isArray(stepCacheData);
                const itemsToLoad = isArrayData ? stepCacheData : [stepCacheData];

                itemsToLoad.forEach((rowPayload, indexId) => {
                    if (indexId >= renderLimitCount) return; 
                    
                    tableStructures[activeTable].forEach(attr => {
                        const elementId = renderLimitCount === 1 ? `attr-${attr}` : `attr-${attr}-${indexId}`;
                        
                        if (['First_time', 'Sex'].includes(attr)) {
                            const radioVal = rowPayload[attr];
                            if (radioVal) {
                                // 💡 Fixed: Target option inputs matching specific generated IDs
                                const radioEl = document.getElementById(`${elementId}-${radioVal}`);
                                if (radioEl) radioEl.checked = true;
                            }
                        } else {
                            const field = document.getElementById(elementId);
                            if (field && rowPayload[attr] !== undefined && rowPayload[attr] !== null) {
                                if (attr === 'Mem_Type') {
                                    field.value = rowPayload[attr];
                                    evaluateSubtypeConditionalDropdowns(rowPayload[attr]);
                                } else if (attr === 'Mem_Subtype') {
                                    field.value = rowPayload[attr];
                                    evaluateOfwFieldsVisibility(rowPayload[attr]);
                                } else {
                                    field.value = rowPayload[attr];
                                }
                            }
                        }
                    });
                });
            }
        } catch (restorationError) {
            console.warn("Restoration loop safely caught exceptions:", restorationError);
        }
    }

    // LOCK DOWN AND MONITOR PAG-IBIG ID FIELD WITH NO PLACEHOLDER
    const primaryIdField = document.getElementById('attr-Pagibig_ID') || document.getElementById('attr-Pagibig_ID-0');
    if (primaryIdField) {
        if (isWizardMode) {
            if (activeTable === 'member') {
                primaryIdField.readOnly = false;
                primaryIdField.disabled = false;
                if (wizardPrimaryTrackingKey) {
                    primaryIdField.value = wizardPrimaryTrackingKey;
                }
            } else {
                for(let i=0; i<renderLimitCount; i++) {
                    const dynamicIdField = document.getElementById(`attr-Pagibig_ID-${i}`) || document.getElementById('attr-Pagibig_ID');
                    if(dynamicIdField) {
                        dynamicIdField.value = wizardPrimaryTrackingKey || '';
                        dynamicIdField.readOnly = true;
                    }
                }
            }
        } else {
            primaryIdField.readOnly = false;
            primaryIdField.disabled = false;
            primaryIdField.value = '';
        }
    }
}

// 💡 FIXED: Reads and preserves typed data from existing blocks before adding a new section pass
function incrementWizardFormRowFields(tableKey) {
    const loopCount = wizardStepRowMultipliers[tableKey] || 1;
    const compiledPayloadCache = [];

    // 1. Gather all inputs currently typed on the screen so we don't lose them
    for (let rowId = 0; rowId < loopCount; rowId++) {
        const singleRowPayload = {};
        
        tableStructures[tableKey].forEach(attr => {
            const domId = loopCount === 1 ? `attr-${attr}` : `attr-${attr}-${rowId}`;
            
            if (['First_time', 'Sex'].includes(attr)) {
                const checkedRadio = document.querySelector(`input[name="name-${domId}"]:checked`);
                singleRowPayload[attr] = checkedRadio ? checkedRadio.value : '';
            } else {
                const inputField = document.getElementById(domId);
                if (inputField) {
                    let val = inputField.value;
                    if (typeof val === 'string' && inputField.tagName.toLowerCase() === 'input' && inputField.type === 'text') {
                        val = val.trim().toUpperCase();
                    }
                    singleRowPayload[attr] = val;
                } else {
                    singleRowPayload[attr] = '';
                }
            }
        });

        if (wizardPrimaryTrackingKey !== null && tableStructures[tableKey].includes('Pagibig_ID')) {
            singleRowPayload['Pagibig_ID'] = wizardPrimaryTrackingKey;
        }
        
        compiledPayloadCache.push(singleRowPayload);
    }

    // 2. Commit the active rows directly into your temporary memory store array
    wizardMultiEntryStore[tableKey] = compiledPayloadCache;

    // 3. Safe increment the field section multiplier pointer
    wizardStepRowMultipliers[tableKey] = loopCount + 1;
    
    triggerNotificationBanner('success', "Successfully appended new input fields.");
    
    // 4. Re-render the form. The restoration engine below will fill in what we just saved!
    buildFormWorkspace();
}

function toggleAddressMirrorSynchronization(checkboxRef) {
    const presentAddrInput = document.getElementById('attr-Present_Address');
    const permAddrValue = document.getElementById('attr-Perm_Address').value;
    
    if (checkboxRef.checked) {
        presentAddrInput.value = permAddrValue;
        presentAddrInput.disabled = true;
    } else {
        presentAddrInput.disabled = false;
        presentAddrInput.value = '';
    }
}

function openChoiceModal() {
    document.getElementById('choice-modal-overlay').classList.remove('hidden');
}

function closeChoiceModal() {
    document.getElementById('choice-modal-overlay').classList.add('hidden');
}

function handleChoiceSelection(selectionType) {
    closeChoiceModal();
    if (selectionType === 'wizard') {
        initiateNewMemberWizard();
    } else if (selectionType === 'single') {
        clearFormCache();
        buildFormWorkspace();
        openCrudModal();
    }
}

function bypassOptionalWizardSegment(tableKey) {
    wizardMultiEntryStore[tableKey] = []; 
    triggerNotificationBanner('success', `Skipped records for ${tableKey}.`);
    
    if (wizardCurrentStepIndex < wizardSteps.length - 1) {
        wizardCurrentStepIndex++;
        activeTable = wizardSteps[wizardCurrentStepIndex];
        workingRecordId = null;
        buildFormWorkspace();
        document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Unified Registration (${activeTable})`;
    }
}

async function advanceWizardStepEngine(direction = 'next') {
    if (direction === 'next' || direction === 'prev') {
        const loopCount = wizardStepRowMultipliers[activeTable] || 1;
        const compiledPayloadCache = [];

        for (let rowId = 0; rowId < loopCount; rowId++) {
            const singleRowPayload = {};
            
            tableStructures[activeTable].forEach(attr => {
                const domId = loopCount === 1 ? `attr-${attr}` : `attr-${attr}-${rowId}`;
                
                if (['First_time', 'Sex'].includes(attr)) {
                    // 💡 Fixed: Extract radio choices utilizing unique indexed row configurations
                    const checkedRadio = document.querySelector(`input[name="name-${domId}"]:checked`);
                    singleRowPayload[attr] = checkedRadio ? checkedRadio.value : '';
                } else {
                    const inputField = document.getElementById(domId);
                    if (inputField) {
                        let val = inputField.value;
                        if (typeof val === 'string' && inputField.tagName.toLowerCase() === 'input' && inputField.type === 'text') {
                            val = val.trim().toUpperCase();
                        }
                        singleRowPayload[attr] = val;
                    } else {
                        singleRowPayload[attr] = '';
                    }
                }
            });

            if (wizardPrimaryTrackingKey !== null && tableStructures[activeTable].includes('Pagibig_ID')) {
                singleRowPayload['Pagibig_ID'] = wizardPrimaryTrackingKey;
            }
            
            compiledPayloadCache.push(singleRowPayload);
        }

        if (!['employment', 'prevemployment', 'heir'].includes(activeTable)) {
            wizardMultiEntryStore[activeTable] = compiledPayloadCache[0];
        } else {
            wizardMultiEntryStore[activeTable] = compiledPayloadCache.filter(rowItem => {
                return Object.keys(rowItem).some(k => k !== 'Pagibig_ID' && k !== 'Heir_Code' && rowItem[k] !== '');
            });
        }
    }

    if (direction === 'prev') {
        if (wizardCurrentStepIndex > 0) {
            wizardCurrentStepIndex--;
            activeTable = wizardSteps[wizardCurrentStepIndex];
            workingRecordId = null;
            await buildFormWorkspace();
            document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Unified Registration (${activeTable})`;
        }
        return;
    }

    if (wizardCurrentStepIndex < wizardSteps.length - 1) {
        wizardCurrentStepIndex++;
        activeTable = wizardSteps[wizardCurrentStepIndex];
        workingRecordId = null;
        await buildFormWorkspace();
        document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Unified Registration (${activeTable})`;
    } else {
        if (wizardMultiEntryStore.heir.length === 0) {
            triggerNotificationBanner('error', "Validation Violation: Member must have at least one beneficiary.");
            return;
        }
        await pushMultiEntryWizardPipeline();
    }
}

async function pushMultiEntryWizardPipeline() {
    try {
        triggerNotificationBanner('success', "Uploading batch registration records...");

        if (wizardMultiEntryStore.member) {
            await fetch(`${API_BASE}/create/member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wizardMultiEntryStore.member)
            });
        }

        if (wizardMultiEntryStore.contact) {
            await fetch(`${API_BASE}/create/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wizardMultiEntryStore.contact)
            });
        }

        const arrayTables = ['employment', 'prevemployment', 'heir'];
        for (let tableKey of arrayTables) {
            const recordsList = wizardMultiEntryStore[tableKey];
            if (recordsList && recordsList.length > 0) {
                for (let dataRow of recordsList) {
                    await fetch(`${API_BASE}/create/${tableKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataRow)
                    });
                }
            }
        }

        if (wizardMultiEntryStore.governmentid) {
            const explicitUserInputs = Object.keys(wizardMultiEntryStore.governmentid).filter(key => key !== 'Pagibig_ID');
            const hasValidIdentificationData = explicitUserInputs.some(
                key => wizardMultiEntryStore.governmentid[key] !== null && wizardMultiEntryStore.governmentid[key].trim() !== ""
            );

            if (hasValidIdentificationData) {
                await fetch(`${API_BASE}/create/governmentid`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(wizardMultiEntryStore.governmentid)
                });
            }
        }

        isWizardMode = false;
        activeTable = 'member';
        fetchLedgerRecords();
        terminateWizardSession();
        triggerNotificationBanner('success', "Full member data has been successfully added to all relations!");

    } catch (err) {
        console.error("Batch commit crash transaction failure:", err);
        triggerNotificationBanner('error', "Fatal transaction failure encountered during sequential data persistence.");
    }
}

async function commitSaveTransaction() {
    // === 📅 DATE & AGE VALIDATION POLISHES ===
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize time components for accurate date evaluation
    
    const isWizard = isWizardMode;
    const currentTable = activeTable;
    const bounds = isWizard ? (wizardStepRowMultipliers[currentTable] || 1) : 1;

    for (let rId = 0; rId < bounds; rId++) {
        // Track down all date structures related to the active operational scope
        const dateFields = ['Birth_Date', 'Date_Employed', 'Date_From', 'Date_To', 'Heir_DateBirth'].filter(d => tableStructures[currentTable].includes(d));

        for (let attr of dateFields) {
            const domId = bounds === 1 ? `attr-${attr}` : `attr-${attr}-${rId}`;
            const dateFieldInput = document.getElementById(domId);
            
            if (dateFieldInput && dateFieldInput.value) {
                const selectedDate = new Date(dateFieldInput.value);
                selectedDate.setHours(0, 0, 0, 0);

                // 1. Absolute Check: Prevent ANY date field from being greater than today
                if (selectedDate > today) {
                    triggerNotificationBanner('error', `Validation Blocked: ${attr.replace(/_/g, ' ')} cannot be a future date.`);
                    return;
                }

                // 2. Age Profile Constraint Check: Enforce minimum age limit of 18 on primary member account holders
                if (attr === 'Birth_Date' && currentTable === 'member') {
                    let age = today.getFullYear() - selectedDate.getFullYear();
                    const monthDifference = today.getMonth() - selectedDate.getMonth();
                    
                    // Adjustment check if their birth month/day hasn't occurred yet in the current year
                    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < selectedDate.getDate())) {
                        age--;
                    }

                    if (age < 18) {
                        triggerNotificationBanner('error', "Registration Refused: Member account registration requires applicant to be at least 18 years old.");
                        return;
                    }
                }
            }
        }
    }

    const isEditMode = workingRecordId !== null;
    if (!isWizardMode || (activeTable === 'employer' && interruptedWizardState !== null)) {
        const dataPayload = {};
        let requiredFieldsMissing = false;
        
        tableStructures[activeTable].forEach(attr => {
            if (['First_time', 'Sex'].includes(attr)) {
                // 💡 Fixed: Target direct single form radio buttons properly
                const checkedRadio = document.querySelector(`input[name="name-attr-${attr}"]:checked`);
                dataPayload[attr] = checkedRadio ? checkedRadio.value : '';
            } else {
                const inputField = document.getElementById(`attr-${attr}`);
                if (inputField) {
                    let val = inputField.value;
                    if (typeof val === 'string' && inputField.tagName.toLowerCase() === 'input' && inputField.type === 'text') {
                        val = val.trim().toUpperCase();
                    }
                    dataPayload[attr] = val;
                }
            }
            if (requiredFieldsConfig[activeTable].includes(attr) && !dataPayload[attr]) requiredFieldsMissing = true;
        });

        if (requiredFieldsMissing) {
            triggerNotificationBanner('error', "Validation Blocked: Missing mandatory fields.");
            return;
        }

        const targetUrl = isEditMode ? `${API_BASE}/update/${activeTable}?${workingRecordId}` : `${API_BASE}/create/${activeTable}`;
        try {
            const response = await fetch(targetUrl, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataPayload)
            });
            const result = await response.json();
            if (result.success) {
                if (activeTable === 'employer' && interruptedWizardState !== null) {
                    cancelEmployerFilingAndReturn();
                } else {
                    fetchLedgerRecords(); closeCrudModal(); clearFormCache();
                }
                triggerNotificationBanner('success', "Record added successfully into the relation!");
            }
        } catch (e) { triggerNotificationBanner('error', "Connection to database failed. Try reconnecting."); }
        return;
    }

    const loopBounds = wizardStepRowMultipliers[activeTable] || 1;
    let requiredFieldsMissing = false;
    let missingFieldLabels = [];

    // ==========================================================================
    // 🔒 FIXED: ACCURATE DATA VALIDATION ENGINE (PREVENTS ACCIDENTAL SKIPS)
    // ==========================================================================
    const isMultiRowTable = ['employment', 'prevemployment', 'heir'].includes(activeTable);

    for (let rowId = 0; rowId < loopBounds; rowId++) {
        tableStructures[activeTable].forEach(attr => {
            if (attr === 'Pagibig_ID' && wizardCurrentStepIndex > 0) return; 
            if (requiredFieldsConfig[activeTable].includes(attr)) {
                const domId = loopBounds === 1 ? `attr-${attr}` : `attr-${attr}-${rowId}`;
                
                let isMissing = false;
                if (['First_time', 'Sex'].includes(attr)) {
                    const checkedRadio = document.querySelector(`input[name="name-${domId}"]:checked`);
                    if (!checkedRadio) isMissing = true;
                } else {
                    const field = document.getElementById(domId);
                    if (!field || !field.value) isMissing = true;
                }

                if (isMissing) {
                    // 💡 FIXED: Only evaluate empty-row bypasses if it's an actual repeated table set
                    let shouldBypassValidation = false;
                    
                    if (isMultiRowTable) {
                        const rowSiblingIds = tableStructures[activeTable].filter(k => k !== 'Pagibig_ID' && k !== 'Heir_Code' && k !== 'Employer_ID');
                        const isEntireRowUntouched = rowSiblingIds.every(k => {
                            const siblingDomId = loopBounds === 1 ? `attr-${k}` : `attr-${k}-${rowId}`;
                            if (['First_time', 'Sex'].includes(k)) {
                                return !document.querySelector(`input[name="name-${siblingDomId}"]:checked`);
                            }
                            const siblingField = document.getElementById(siblingDomId);
                            return !siblingField || !siblingField.value;
                        });
                        
                        // Row #1 (rowId === 0) must NEVER bypass validation if the table has required fields!
                        if (isEntireRowUntouched && rowId > 0) {
                            shouldBypassValidation = true;
                        }
                    }

                    // If it's a standard single-entry step, or a row that was partially filled out, throw the error banner
                    if (!shouldBypassValidation) {
                        requiredFieldsMissing = true;
                        
                        if (isMultiRowTable && loopBounds > 1) {
                            missingFieldLabels.push(`${attr.replace(/_/g, ' ')} (Row #${rowId + 1})`);
                        } else {
                            missingFieldLabels.push(attr.replace(/_/g, ' '));
                        }
                    }
                }
            }
        });
    }

    if (requiredFieldsMissing) {
        triggerNotificationBanner('error', `Missing Required Fields: ${[...new Set(missingFieldLabels)].join(', ')}`);
        return;
    }

    if (activeTable === 'member') {
        const idField = document.getElementById('attr-Pagibig_ID');
        if (idField) wizardPrimaryTrackingKey = idField.value;
    }

    advanceWizardStepEngine('next');
}

async function fetchLedgerRecords() {
    const response = await fetch(`${API_BASE}/table/${activeTable}`);
    const rows = await response.json();
    
    const head = document.getElementById('ledger-header-target');
    const body = document.getElementById('ledger-body-target');
    head.innerHTML = ''; body.innerHTML = '';
    
    const primaryColumns = Object.keys(rows[0] || {});
    if (!rows || rows.length === 0 || primaryColumns.length === 0) {
        const fallbackHeaders = tableStructures[activeTable];
        let headerString = '<tr>';
        fallbackHeaders.forEach(c => headerString += `<th>${c}</th>`);
        headerString += '<th>Actions</th></tr>'; head.innerHTML = headerString;
        body.innerHTML = `<tr><td colspan="100%" style="text-align:center; padding:40px; color:#64748b;">No records found inside the active schema ledger matrix.</td></tr>`;
        return;
    }

    let headerString = '<tr>';
    primaryColumns.forEach(c => headerString += `<th>${c}</th>`);
    headerString += '<th style="text-align:center;">Actions</th></tr>';
    head.innerHTML = headerString;

    rows.forEach(itemRow => {
        let rowString = '<tr>';
        primaryColumns.forEach(c => {
            let cellValue = itemRow[c] !== null && itemRow[c] !== undefined ? itemRow[c] : '';
            if (typeof cellValue === 'string' && cellValue.includes('T') && !isNaN(Date.parse(cellValue))) cellValue = cellValue.split('T')[0];
            rowString += `<td>${cellValue}</td>`;
        });
        const keyData = {};
        primaryKeyTracker[activeTable].forEach(k => keyData[k] = itemRow[k]);
        const keyParamString = new URLSearchParams(keyData).toString();
        rowString += `<td class="action-cell-btns">
            <button class="btn-secondary" onclick="stageRowModification(${JSON.stringify(itemRow).replace(/"/g, '&quot;')}, '${keyParamString}')">Edit</button>
            <button class="btn-danger" onclick="executeRowRemoval('${keyParamString}')">Delete</button>
        </td></tr>`;
        body.innerHTML += rowString;
    });
}

function stageRowModification(rowData, keyParamString) {
    workingRecordId = keyParamString;
    isWizardMode = false; 
    buildFormWorkspace().then(() => {
        tableStructures[activeTable].forEach(attr => {
            let val = rowData[attr] !== null ? rowData[attr] : '';
            if (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val))) val = val.split('T')[0];
            
            const radioEl = document.querySelector(`input[name="name-attr-${attr}"][value="${val}"]`);
            if (radioEl) { radioEl.checked = true; } 
            else {
                const inputField = document.getElementById(`attr-${attr}`);
                if (inputField) {
                    if (attr === 'Mem_Type') {
                        inputField.value = val; evaluateSubtypeConditionalDropdowns(val);
                    } else if (attr === 'Mem_Subtype') {
                        const containsOption = Array.from(inputField.options).some(opt => opt.value === val);
                        if (containsOption) { inputField.value = val; } 
                        else if (val !== '') {
                            inputField.value = 'OTHERS'; evaluateOthersSpecificationField(inputField, 'Mem_Subtype');
                            const customField = document.getElementById('attr-Mem_Subtype-others');
                            if (customField) customField.value = val;
                        }
                    } else { inputField.value = val; }
                }
            }
        });
        document.getElementById('modal-title-intent').innerText = `Modify Record Entry`;
        openCrudModal();
    });
}

function executeRowRemoval(keyParamString) {
    const promptString = 'You are about to permanently delete this record. It will be removed from the table and cannot be recovered. <br><strong>Are you sure you want to delete?</strong>';
    executeProtectedConfirmationPrompt('delete', promptString, async () => {
        const response = await fetch(`${API_BASE}/delete/${activeTable}?${keyParamString}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) { fetchLedgerRecords(); triggerNotificationBanner('success', "Record successfully removed."); }
    });
}

function openCrudModal() { document.getElementById('modal-overlay').classList.remove('hidden'); }
function closeCrudModal() { document.getElementById('modal-overlay').classList.add('hidden'); clearFormCache(); }

function executeLedgerSearchFilter() {
    applyTableFiltering();
}

function applyTableFiltering() {
    const searchVal = (document.getElementById('ledger-search-input').value || '').toLowerCase();
    const rows = document.getElementById('ledger-body-target').getElementsByTagName('tr');
    const headers = document.getElementById('ledger-header-target').querySelectorAll('th');
    const columnIndexMap = {};
    headers.forEach((th, i) => { columnIndexMap[th.textContent.trim()] = i; });

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].cells;

        // Global text search across all data columns
        let matchesSearch = !searchVal;
        if (!matchesSearch) {
            for (let j = 0; j < cells.length - 1; j++) {
                if (cells[j].textContent.toLowerCase().includes(searchVal)) { matchesSearch = true; break; }
            }
        }

        // Attribute filters — every active filter must pass
        let matchesFilters = true;
        for (const [colKey, filter] of Object.entries(activeFilters)) {
            if (!filter || !filter.value) continue;
            const colIdx = columnIndexMap[colKey];
            if (colIdx === undefined) continue;
            const cellText = cells[colIdx] ? cells[colIdx].textContent.trim() : '';

            if (filter.type === 'date-range') {
                // Compare as date strings (YYYY-MM-DD)
                const cellDate = cellText; // already YYYY-MM-DD from fetchLedgerRecords
                if (filter.value && cellDate < filter.value) { matchesFilters = false; break; }
                if (filter.valueTo && cellDate > filter.valueTo) { matchesFilters = false; break; }
            } else {
                if (!cellText.toLowerCase().includes(filter.value.toLowerCase())) { matchesFilters = false; break; }
            }
        }

        rows[i].style.display = (matchesSearch && matchesFilters) ? '' : 'none';
    }

    // Update active badge count
    const activeCount = Object.values(activeFilters).filter(f => f && f.value).length;
    const badge = document.getElementById('filter-active-badge');
    if (badge) {
        badge.textContent = activeCount;
        badge.classList.toggle('hidden', activeCount === 0);
    }
}

function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        buildFilterPanel();
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function buildFilterPanel() {
    const container = document.getElementById('filter-fields-container');
    if (!container) return;
    const columns = tableStructures[activeTable] || [];
    container.innerHTML = '';

    columns.forEach(col => {
        const label = col.replace(/_/g, ' ');
        const def = FILTER_FIELD_DEFINITIONS[col];
        const current = activeFilters[col] || {};
        let inputHtml = '';

        if (def && def.type === 'select') {
            const opts = def.options.map(o => {
                const val = typeof o === 'object' ? o.value : o;
                const lbl = typeof o === 'object' ? o.label : o;
                const selected = current.value === val ? 'selected' : '';
                return `<option value="${val}" ${selected}>${lbl}</option>`;
            }).join('');
            inputHtml = `
                <select class="filter-field-input" onchange="setFilterValue('${col}','select',this.value)">
                    <option value="">— Any —</option>
                    ${opts}
                </select>`;

        } else if (def && def.type === 'radio') {
            const btns = def.options.map(o => {
                const active = current.value === o ? 'filter-radio-active' : '';
                return `<button type="button" class="filter-radio-btn ${active}" onclick="setFilterValue('${col}','radio','${o}',this)">${o}</button>`;
            }).join('');
            inputHtml = `<div class="filter-radio-group">${btns}</div>`;

        } else if (def && def.type === 'date-range') {
            inputHtml = `
                <div class="filter-date-range">
                    <input type="date" class="filter-field-input" value="${current.value || ''}"
                        placeholder="From"
                        oninput="setFilterDateFrom('${col}', this.value)">
                    <span class="filter-date-sep">to</span>
                    <input type="date" class="filter-field-input" value="${current.valueTo || ''}"
                        placeholder="To"
                        oninput="setFilterDateTo('${col}', this.value)">
                </div>`;

        } else {
            inputHtml = `
                <input type="text" class="filter-field-input" placeholder="Any"
                    value="${current.value || ''}"
                    oninput="setFilterValue('${col}','text',this.value)">`;
        }

        container.innerHTML += `
            <div class="filter-field-row">
                <label class="filter-field-label">${label}</label>
                ${inputHtml}
            </div>`;
    });
}

function setFilterValue(col, type, value, radioBtn) {
    // For radio: clicking the active button again clears it (toggle off)
    if (type === 'radio' && activeFilters[col] && activeFilters[col].value === value) {
        delete activeFilters[col];
        if (radioBtn) radioBtn.classList.remove('filter-radio-active');
        // Clear all radio buttons in that group
        radioBtn.closest('.filter-radio-group').querySelectorAll('.filter-radio-btn').forEach(b => b.classList.remove('filter-radio-active'));
    } else {
        activeFilters[col] = { type, value };
        if (type === 'radio' && radioBtn) {
            radioBtn.closest('.filter-radio-group').querySelectorAll('.filter-radio-btn').forEach(b => b.classList.remove('filter-radio-active'));
            radioBtn.classList.add('filter-radio-active');
        }
    }
    applyTableFiltering();
}

function setFilterDateFrom(col, value) {
    if (!activeFilters[col]) activeFilters[col] = { type: 'date-range', value: '', valueTo: '' };
    activeFilters[col].value = value;
    applyTableFiltering();
}

function setFilterDateTo(col, value) {
    if (!activeFilters[col]) activeFilters[col] = { type: 'date-range', value: '', valueTo: '' };
    activeFilters[col].valueTo = value;
    applyTableFiltering();
}

function clearAllFilters() {
    activeFilters = {};
    buildFilterPanel(); // re-render to reset all inputs
    applyTableFiltering();
}

// Close filter panel when clicking outside
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('filter-dropdown-wrapper');
    const panel = document.getElementById('filter-panel');
    if (panel && !panel.classList.contains('hidden') && wrapper && !wrapper.contains(e.target)) {
        panel.classList.add('hidden');
    }
});

function triggerNotificationBanner(messageType, descriptionText) {
    const container = document.getElementById('toast-notification-container');
    const toastNode = document.createElement('div');
    
    let icon = messageType === 'error' ? 'error' : 'check_circle';
    
    toastNode.className = `toast-alert-card ${messageType}`;
    
    toastNode.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <span>${descriptionText}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toastNode);
    setTimeout(() => { if (toastNode.parentElement) toastNode.remove(); }, 4500);
}

function executeProtectedConfirmationPrompt(iconName, promptString, affirmativeCallback) {
    const overlay = document.getElementById('confirm-modal-overlay');
    const messageNode = document.getElementById('confirm-modal-message');
    const iconNode = document.getElementById('confirm-modal-icon');

    if (messageNode) {
        messageNode.innerHTML = promptString;
    }
    if (iconNode) {
        iconNode.innerText = iconName;
    }

    overlay.classList.remove('hidden');
    
    const btnYes = document.getElementById('confirm-btn-yes');
    const btnNo = document.getElementById('confirm-btn-no');
    
    const clearPromptSession = () => { 
        overlay.classList.add('hidden'); 
        if (btnYes) btnYes.onclick = null; 
        if (btnNo) btnNo.onclick = null; 
    };
    
    if (btnNo) btnNo.onclick = clearPromptSession;
    if (btnYes) btnYes.onclick = () => { affirmativeCallback(); clearPromptSession(); };
}

function openHelpModal() { document.getElementById('help-modal-overlay').classList.remove('hidden'); }
function closeHelpModal() { document.getElementById('help-modal-overlay').classList.add('hidden'); }

function evaluateSubtypeConditionalDropdowns(selectedType) {
    const wrapper = document.getElementById('subtype-conditional-wrapper');
    if (!wrapper) return;
    if (selectedType === 'MANDATORY') {
        wrapper.innerHTML = `<select id="attr-Mem_Subtype" onchange="evaluateOthersSpecificationField(this, 'Mem_Subtype'); evaluateOfwFieldsVisibility(this.value);"><option value="" selected disabled>-- Select Mandatory Subtype --</option><option value="EMPLOYED">EMPLOYED</option><option value="OVERSEAS FILIPINO WORKER (OFW)">OVERSEAS FILIPINO WORKER (OFW)</option><option value="SELF-EMPLOYED">SELF-EMPLOYED</option><option value="OTHERS">OTHERS (SPECIFY)</option></select><input type="text" id="attr-Mem_Subtype-others" placeholder="Please specify dynamic category..." style="display:none; margin-top:8px;">`;
    } else if (selectedType === 'VOLUNTARY') {
        wrapper.innerHTML = `<select id="attr-Mem_Subtype" onchange="evaluateOthersSpecificationField(this, 'Mem_Subtype'); evaluateOfwFieldsVisibility(this.value);"><option value="" selected disabled>-- Select Voluntary Subtype --</option><option value="EMPLOYED">EMPLOYED</option><option value="INDIVIDUAL PAYOR">INDIVIDUAL PAYOR</option><option value="OTHERS">OTHERS (SPECIFY)</option></select><input type="text" id="attr-Mem_Subtype-others" placeholder="Please specify dynamic category..." style="display:none; margin-top:8px;">`;
    }
    evaluateOfwFieldsVisibility("");
}

function evaluateOthersSpecificationField(selectElement, elementAttributeKey) {
    const textInputField = document.getElementById(`attr-${elementAttributeKey}-others`);
    if (!textInputField) return;
    if (selectElement.value === 'OTHERS') { textInputField.style.display = "block"; textInputField.focus(); } 
    else { textInputField.style.display = "none"; textInputField.value = ""; }
}

document.body.addEventListener('keydown', (event) => {
    const formGridContainer = document.getElementById('form-grid-target');
    if (!formGridContainer || !formGridContainer.contains(event.target)) return;
    if (event.key === 'Enter') {
        if(event.target.type === 'radio' || event.target.tagName.toLowerCase() === 'button') return;
        event.preventDefault();
        const formFields = Array.from(formGridContainer.querySelectorAll('input:not([disabled]), select:not([disabled])')).filter(el => el.style.display !== 'none' && el.type !== 'hidden');
        const activeIndex = formFields.indexOf(document.activeElement);
        if (activeIndex !== -1) {
            if (activeIndex < formFields.length - 1) { formFields[activeIndex + 1].focus(); } 
            else { commitSaveTransaction(); }
        }
    }
});

function evaluateOfwFieldsVisibility(selectedSubtype) {
    const rowWork = document.getElementById('grid-row-wrapper-Type_Work');
    const rowCountry = document.getElementById('grid-row-wrapper-Type_Country');
    if (!rowWork || !rowCountry) return;
    const labelWork = rowWork.querySelector('label');
    const labelCountry = rowCountry.querySelector('label');
    if (selectedSubtype && selectedSubtype.toUpperCase().includes('OFW')) {
        rowWork.style.display = "flex"; rowCountry.style.display = "flex";
        if (labelWork) labelWork.innerHTML = `Type Work <span class="required-asterisk">*</span>`;
        if (labelCountry) labelCountry.innerHTML = `Type Country <span class="required-asterisk">*</span>`;
    } else {
        rowWork.style.display = "none"; rowCountry.style.display = "none";
        if (labelWork) labelWork.innerHTML = `Type Work`;
        if (labelCountry) labelCountry.innerHTML = `Type Country`;
        const inputWork = document.getElementById('attr-Type_Work');
        const inputCountry = document.getElementById('attr-Type_Country');
        if (inputWork) inputWork.value = ""; if (inputCountry) inputCountry.value = "";
    }
}

function toggleSidebarMenuLayout() {
    const sidebar = document.getElementById('main-sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    if (!sidebar) return;
    sidebar.classList.toggle('minimized');
    toggleIcon.innerText = sidebar.classList.contains('minimized') ? 'menu' : 'menu_open';
}

function cancelEmployerFilingAndReturn() {
    if (interruptedWizardState !== null) {
        isWizardMode = true;
        wizardCurrentStepIndex = interruptedWizardState.wizardCurrentStepIndex;
        wizardPrimaryTrackingKey = interruptedWizardState.wizardPrimaryTrackingKey;
        activeTable = wizardSteps[wizardCurrentStepIndex];
        workingRecordId = null;

        document.querySelectorAll('#table-tabs li').forEach(el => {
            if (el.innerText.includes('Member Information')) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Unified Registration (${activeTable})`;

        buildFormWorkspace().then(() => {
            Object.keys(interruptedWizardState.cachedFormData).forEach(domElementId => {
                const val = interruptedWizardState.cachedFormData[domElementId];
                if (domElementId.startsWith('name-attr-First_time') || domElementId.startsWith('name-attr-Sex')) {
                    const radioEl = document.querySelector(`input[name="${domElementId}"][value="${val}"]`);
                    if (radioEl) radioEl.checked = true;
                } else {
                    const inputField = document.getElementById(domElementId);
                    if (inputField) inputField.value = val;
                }
            });
            interruptedWizardState = null;
            triggerNotificationBanner('success', "Returned back to Member Registration!");
        });
    } else { closeCrudModal(); }
}

function executeAdministrativeSessionTermination() {
    const promptString = 'You will be logged out of the Pag-IBIG Admin Portal. Any unsaved changes in memory will be lost. <br><strong> Are you sure you want to log out?</strong>';
    executeProtectedConfirmationPrompt('logout', promptString, () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        localStorage.removeItem('isAdminAuthenticated');
        isWizardMode = false; 
        wizardPrimaryTrackingKey = null;
        window.location.replace("login.html");
    });
}
// 💡 NEW: Evicts an entire dynamic row block and shifts remaining inputs into alignment balances
function evictWizardRowSetFields(tableKey, blockRowIndex) {
    const loopCount = wizardStepRowMultipliers[tableKey] || 1;
    const compiledPayloadCache = [];

    // 1. First, gather what's currently typed everywhere so we don't wipe active inputs
    for (let rowId = 0; rowId < loopCount; rowId++) {
        const singleRowPayload = {};
        tableStructures[tableKey].forEach(attr => {
            const domId = loopCount === 1 ? `attr-${attr}` : `attr-${attr}-${rowId}`;
            if (['First_time', 'Sex'].includes(attr)) {
                const checkedRadio = document.querySelector(`input[name="name-${domId}"]:checked`);
                singleRowPayload[attr] = checkedRadio ? checkedRadio.value : '';
            } else {
                const inputField = document.getElementById(domId);
                singleRowPayload[attr] = inputField ? inputField.value : '';
            }
        });
        compiledPayloadCache.push(singleRowPayload);
    }

    // 2. Remove the chosen row block row out of the temporary data cache array
    compiledPayloadCache.splice(blockRowIndex, 1);
    wizardMultiEntryStore[tableKey] = compiledPayloadCache;

    // 3. Decrease the structural multiplier counter tracker by one row index unit
    if (wizardStepRowMultipliers[tableKey] > 1) {
        wizardStepRowMultipliers[tableKey]--;
    }

    triggerNotificationBanner('error', "Section removed.");
    
    // 4. Re-render the form canvas view safely
    buildFormWorkspace();
}

// 📞 PHONE NUMBER INPUT FILTER: Only allows numbers (0-9), spaces, and the "+" sign
document.body.addEventListener('input', (event) => {
    const target = event.target;
    
    // Check if the input field is one of your designated phone number columns
    if (target && ['Cell_Num', 'Home_Num', 'Business_Direct', 'Business_Trunk'].some(attr => target.id.includes(attr))) {
        
        // Strip out any character that is NOT a number, a space, or a plus sign
        const filteredValue = target.value.replace(/[^0-9+\s]/g, '');
        
        // Prevent typing multiple '+' signs by ensuring it only stays at the very beginning
        if (filteredValue.includes('+')) {
            // Keep the first '+' and strip any subsequent ones
            target.value = '+' + filteredValue.replace(/\+/g, '');
        } else {
            target.value = filteredValue;
        }
    }
});