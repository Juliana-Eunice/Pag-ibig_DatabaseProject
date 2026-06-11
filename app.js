const API_BASE = 'http://localhost:3000/api';
let activeTable = 'member'; 
let workingRecordId = null; 

// Global State Tracking Variables for Multi-Step Transaction Flow Mechanisms
let isWizardMode = false;
const wizardSteps = ['member', 'contact', 'employment', 'prevemployment', 'heir', 'governmentid'];
let wizardCurrentStepIndex = 0;
let wizardPrimaryTrackingKey = null; 
let interruptedWizardState = null;   

// 💡 UPDATED: Now caches EVERY single step locally until the final submission commit
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

window.addEventListener('DOMContentLoaded', () => {
    buildFormWorkspace();
    fetchLedgerRecords();
});

function changeWorkspaceTable(tableKey, menuRef) {
    activeTable = tableKey;
    document.querySelectorAll('#table-tabs li').forEach(el => el.classList.remove('selected'));
    menuRef.classList.add('selected');
    document.getElementById('active-title').innerText = tableKey;
    document.getElementById('breadcrumb-sub').innerText = tableKey;
    
    clearFormCache();
    buildFormWorkspace();
    fetchLedgerRecords();

    const searchInput = document.getElementById('ledger-search-input');
    if (searchInput) searchInput.value = '';
}

function initiateNewMemberWizard() {
    isWizardMode = true;
    wizardCurrentStepIndex = 0;
    wizardPrimaryTrackingKey = null;
    interruptedWizardState = null;
    
    // Clear ALL multi-entry tracking objects to prevent trailing data residue leaks
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
        
        // Wipe caching models clear on standalone dismissals
        wizardMultiEntryStore.member = null;
        wizardMultiEntryStore.contact = null;
        wizardMultiEntryStore.employment = [];
        wizardMultiEntryStore.prevemployment = [];
        wizardMultiEntryStore.heir = [];
        wizardMultiEntryStore.governmentid = null;
    }
    
    tableStructures[activeTable].forEach(attr => {
        if (['First_time', 'Sex'].includes(attr)) {
            const radios = document.querySelectorAll(`input[name="attr-${attr}"]`);
            radios.forEach(r => r.checked = false);
        } else {
            const inputField = document.getElementById(`attr-${attr}`);
            if (inputField) inputField.value = '';
        }
    });
    
    if (!isWizardMode) {
        document.getElementById('modal-title-intent').innerText = "Add Direct Transaction Log Entry";
    }
}

function terminateWizardSession() {
    isWizardMode = false;
    wizardPrimaryTrackingKey = null;
    interruptedWizardState = null;
    closeCrudModal();
}

// Generates Progress Bars and Navigation Controls for Wizard Workflows
function injectWizardProgressIndicator() {
    const box = document.getElementById('form-grid-target');
    
    let progressHtml = `<div class="wizard-progress-bar">`;
    wizardSteps.forEach((step, idx) => {
        let statusClass = 'wizard-step-indicator';
        let icon = 'circle'; // Default upcoming circle
        
        if (idx === wizardCurrentStepIndex) {
            statusClass += ' active-step';
            icon = 'radio_button_unchecked'; // Outer ring indicator for the current step
        } else if (idx < wizardCurrentStepIndex) {
            statusClass += ' completed-step';
            icon = 'check'; // Checkmark icon for completed steps
        }
        
        // Clean up text displays matching your layout limits
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
    
    // Quick-jump Button Trigger for missing Employers on employment step views
    if (['employment', 'prevemployment'].includes(activeTable)) {
        progressHtml += `
            <div class="inline-action-notice">
                <span>Can't find the registered business listed in the drop-down selector?</span>
                <button type="button" class="btn-primary" style="padding: 6px 12px; font-size:12px;" onclick="suspendWizardForEmployerFiling()">+ Input New Employer</button>
            </div>`;
    }
    
    box.innerHTML = progressHtml + box.innerHTML;
}

function suspendWizardForEmployerFiling() {
    interruptedWizardState = {
        wizardCurrentStepIndex: wizardCurrentStepIndex,
        wizardPrimaryTrackingKey: wizardPrimaryTrackingKey,
        cachedFormData: {}
    };
    
    tableStructures[activeTable].forEach(attr => {
        if (['First_time', 'Sex'].includes(attr)) {
            const checkedRadio = document.querySelector(`input[name="attr-${attr}"]:checked`);
            if (checkedRadio) interruptedWizardState.cachedFormData[attr] = checkedRadio.value;
        } else {
            const field = document.getElementById(`attr-${attr}`);
            if (field) interruptedWizardState.cachedFormData[attr] = field.value;
        }
    });
    
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

    let nextHeirCode = 'H001';
    if (activeTable === 'heir' && isNewRecord) {
        const offset = wizardMultiEntryStore.heir.length;
        try {
            const response = await fetch(`${API_BASE}/table/heir`);
            const rows = await response.json();
            let highestHeirNum = 0;
            rows.forEach(r => {
                const match = (r.Heir_Code || '').match(/^H(\d+)$/i);
                if (match) highestNum = Math.max(highestHeirNum, parseInt(match[1], 10));
            });
            nextHeirCode = `H${String(highestHeirNum + 1 + offset).padStart(3, '0')}`;
        } catch(e) { 
            nextHeirCode = `H${String(1 + offset).padStart(3, '0')}`; 
        }
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

    tableStructures[activeTable].forEach(attr => {
        if (attr === 'id') return;
        let labelName = attr.replace(/_/g, ' ');
        let inputHtml = '';
        
        const isRequired = requiredFieldsConfig[activeTable].includes(attr);
        const requiredAsterisk = isRequired ? ' <span class="required-asterisk">*</span>' : '';

        switch (attr) {
            case 'Occ_Stats':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Status --</option><option value="UNEMPLOYED/NOT YET EMPLOYED">UNEMPLOYED / NOT YET EMPLOYED</option><option value="EMPLOYED">EMPLOYED</option></select>`;
                break;
            case 'First_time':
                inputHtml = `
                    <div class="radio-group-container">
                        <label class="radio-inline-label"><input type="radio" name="attr-${attr}" id="attr-${attr}-YES" value="YES"> YES</label>
                        <label class="radio-inline-label"><input type="radio" name="attr-${attr}" id="attr-${attr}-NO" value="NO"> NO</label>
                    </div>`;
                break;
            case 'Mem_Type':
                inputHtml = `<select id="attr-${attr}" onchange="evaluateSubtypeConditionalDropdowns(this.value)"><option value="" selected disabled>-- Select Membership Type --</option><option value="MANDATORY">MANDATORY</option><option value="VOLUNTARY">VOLUNTARY</option></select>`;
                break;
            case 'Mem_Subtype':
                inputHtml = `
                    <div id="subtype-conditional-wrapper" style="width:100%;">
                        <select id="attr-${attr}" onchange="evaluateSubtypeConditionalDropdowns(document.getElementById('attr-Mem_Type').value); evaluateOfwFieldsVisibility(this.value);">
                            <option value="" selected disabled>-- Select Membership Type First --</option>
                        </select>
                    </div>`;
                break;
            case 'Type_Work':
                inputHtml = `
                    <select id="attr-${attr}">
                        <option value="" selected disabled>-- Select Type of Work --</option>
                        <option value="Land-based">Land-based</option>
                        <option value="Sea-based">Sea-based</option>
                    </select>`;
                break;
            case 'Type_Country':
                inputHtml = `<input type="text" id="attr-${attr}" maxlength="30" placeholder="e.g. SINGAPORE" autocomplete="off">`;
                break;
            case 'Sex':
                inputHtml = `
                    <div class="radio-group-container">
                        <label class="radio-inline-label"><input type="radio" name="attr-${attr}" id="attr-${attr}-M" value="M"> M</label>
                        <label class="radio-inline-label"><input type="radio" name="attr-${attr}" id="attr-${attr}-F" value="F"> F</label>
                    </div>`;
                break;
            case 'Marital_Status':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Marital Status --</option><option value="S">Single / Unmarried</option><option value="W">Widow / er</option><option value="A">Annulled</option><option value="M">Married</option><option value="LS">Legally Separated</option></select>`;
                break;
            case 'Frequency_Payment':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Frequency --</option><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option></select>`;
                break;
            case 'Pref_Mail_Address':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Preferred Address --</option><option value="Present Home Address">Present Home Address</option><option value="Permanent Home Address">Permanent Home Address</option><option value="Employer/Business Address">Employer / Business Address</option></select>`;
                break;
            case 'Employer_ID':
                if (['employment', 'prevemployment'].includes(activeTable)) {
                    inputHtml = `<select id="attr-${attr}">${employerOptionsHtml}</select>`;
                } else if (activeTable === 'employer') {
                    inputHtml = `<input type="text" id="attr-${attr}" value="${isNewRecord ? nextEmployerId : ''}" disabled>`;
                }
                break;
            case 'Employment_Status':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Employment Status --</option><option value="Permanent/Regular">Permanent / Regular</option><option value="Casual">Casual</option><option value="Contractual">Contractual</option><option value="Project-based">Project-based</option><option value="Part-time/Temporary">Part-time / Temporary</option></select>`;
                break;
            case 'Office_Assignment':
            case 'PrevOffice_Assignment':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Office Assignment --</option><option value="Head Office">Head Office</option><option value="Branch Office">Branch Office</option></select>`;
                break;
            case 'Heir_Code':
                inputHtml = `<input type="text" id="attr-${attr}" value="${isNewRecord ? nextHeirCode : ''}" disabled>`;
                break;
            default:
                let inputType = 'text';
                let extraAttributes = '';
                let placeholderText = '';
                const numericColumns = ['Pagibig_ID', 'Regis_num', 'Height', 'Weight', 'Monthly_Income', 'TIN_Num', 'SSS_Num', 'CRN', 'EM_Num', 'AFP_PNP_Num', 'Deped_Code'];
                const dateColumns = ['Birth_Date', 'Date_Employed', 'Date_From', 'Date_To', 'Heir_DateBirth'];

                if (numericColumns.includes(attr)) inputType = 'number';
                if (dateColumns.includes(attr)) inputType = 'date';

                if (['Mem_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'MemCert_Name', 'Heir_Name'].includes(attr)) {
                    placeholderText = 'LAST NAME, FIRST NAME MIDDLE NAME';
                } else if (['Cell_Num', 'Home_Num', 'Business_Direct', 'Business_Trunk'].includes(attr)) {
                    placeholderText = '+63 XXX XXXX XXX';
                }

                if (inputType === 'text') {
                    extraAttributes = `placeholder="${placeholderText}"`;
                    
                    // 50 Characters: Names & Employer Names
                    if (['Mem_Name', 'MemCert_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'Heir_Name', 'Employer_Name'].includes(attr)) {
                        extraAttributes += ' maxlength="50"'; 
                    } 
                    // 80 Characters: Place of Birth & Addresses
                    else if (['Place_Birth', 'Perm_Address', 'Present_Address', 'Employer_Address'].includes(attr)) {
                        extraAttributes += ' maxlength="80"'; 
                    } 
                    // 50 Characters: Facial Features
                    else if (attr === 'Facial_Features') {
                        extraAttributes += ' maxlength="50"';
                    }
                    // 30 Characters: Type Country
                    else if (attr === 'Type_Country') {
                        extraAttributes += ' maxlength="30"'; 
                    } 
                    // 15-16 Characters: Contact Strings & Relationships
                    else if (attr === 'Cell_Num') {
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

                inputHtml = `<input type="${inputType}" id="attr-${attr}" ${extraAttributes} autocomplete="off">`;
                break;
        }

        let wrapperIdHtml = '';
        if (attr === 'Type_Work' || attr === 'Type_Country') {
            wrapperIdHtml = ` id="grid-row-wrapper-${attr}" style="display: none;"`;
        }

        box.innerHTML += `
            <div${wrapperIdHtml}>
                <label for="attr-${attr}">${labelName}${requiredAsterisk}</label>
                ${inputHtml}
            </div>`;
    });

    // Address synchronization checkbox injection logic rules
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
        
        // Listen to active input typings on permanent address field to sync real-time changes
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

    const primaryIdField = document.getElementById('attr-Pagibig_ID');
    if (primaryIdField) {
        if (isWizardMode) {
            if (wizardPrimaryTrackingKey !== null && activeTable !== 'member') {
                // Inside the wizard (Steps 2-6): Lock the ID so it matches Step 1 perfectly
                primaryIdField.value = wizardPrimaryTrackingKey;
                primaryIdField.readOnly = true;
            } else {
                // Inside the wizard (Step 1): Allow them to type the initial ID freely
                primaryIdField.readOnly = false;
            }
        } else {
            // Single Table Mode: Always keep it unlocked so admins can type any valid ID manually!
            primaryIdField.readOnly = false;
            primaryIdField.value = '';
        }
    }

    if (isWizardMode) {
        injectWizardProgressIndicator();
        
        // Inject structural operational layout for Multi-Row entries or dynamic skips
        let wizardFooterActionsHtml = '';
        if (['employment', 'prevemployment'].includes(activeTable)) {
            wizardFooterActionsHtml += `
                <div class="wizard-array-actions-block">
                    <button type="button" class="btn-secondary" style="background-color: #f1f5f9; color: var(--pagibig-blue);" onclick="stageWizardArrayRowCache('${activeTable}')">+ Cache & Add Another Job</button>
                    <button type="button" class="btn-danger" style="background-color: #fef2f2; color: #dc2626;" onclick="bypassOptionalWizardSegment('${activeTable}')">Skip This Section entirely</button>
                </div>`;
        } else if (activeTable === 'heir') {
            wizardFooterActionsHtml += `
                <div class="wizard-array-actions-block">
                    <button type="button" class="btn-secondary" style="background-color: #f1f5f9; color: var(--pagibig-blue);" onclick="stageWizardArrayRowCache('heir')">+ Cache & Add Another Beneficiary</button>
                </div>`;
        }
        
        if (wizardFooterActionsHtml) {
            box.insertAdjacentHTML('beforeend', `<div style="grid-column: span 2; margin-top: 10px;">${wizardFooterActionsHtml}</div>`);
        }

        const nextButton = document.querySelector('.modal-footer .btn-primary');
        if (nextButton) {
            nextButton.innerText = (wizardCurrentStepIndex === wizardSteps.length - 1) ? "Finish & Save" : "Next Step →";
        }
    } else if (activeTable === 'employer' && interruptedWizardState !== null) {
        const saveButton = document.querySelector('.modal-footer .btn-primary');
        if (saveButton) saveButton.innerText = "Commit Employer & Return";
    }
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

// Intercept array targets to build multi-record entities inside local cache memories
function stageWizardArrayRowCache(tableKey) {
    const currentPayload = {};
    let fieldsAreValid = true;
    
    tableStructures[tableKey].forEach(attr => {
        const field = document.getElementById(`attr-${attr}`);
        if (field) {
            let val = field.value;
            if (field.type === 'text') val = val.trim().toUpperCase();
            
            if (requiredFieldsConfig[tableKey].includes(attr) && !val) {
                fieldsAreValid = false;
            }
            currentPayload[attr] = val;
        }
    });

    if (isWizardMode && wizardPrimaryTrackingKey !== null) {
        currentPayload['Pagibig_ID'] = wizardPrimaryTrackingKey;
    }

    if (!fieldsAreValid) {
        triggerNotificationBanner('error', `Validation Failed: Please fill all required fields before caching rows.`);
        return;
    }

    wizardMultiEntryStore[tableKey].push(currentPayload);
    triggerNotificationBanner('success', `Logged Entry stored internally! You can now log an additional record.`);
    
    // Refresh workspace form to increment serial keys or empty fields out safely
    buildFormWorkspace();
}

function bypassOptionalWizardSegment(tableKey) {
    wizardMultiEntryStore[tableKey] = []; // Explicitly flag table segment context as skipped empty
    triggerNotificationBanner('success', `Skipped segment details module framework for ${tableKey}.`);
    advanceWizardStepEngine();
}

async function advanceWizardStepEngine() {
    if (wizardCurrentStepIndex < wizardSteps.length - 1) {
        wizardCurrentStepIndex++;
        activeTable = wizardSteps[wizardCurrentStepIndex];
        workingRecordId = null;
        
        await buildFormWorkspace();
        document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Unified Registration (${activeTable})`;
    } else {
        // Final Wizard validation step check: Verify dynamic beneficiary registry is not left blank
        if (wizardMultiEntryStore.heir.length === 0) {
            triggerNotificationBanner('error', "Validation Violation: At least one Beneficiary registry item must be logged.");
            return;
        }

        // Commit full batch process out onto backend REST routes pipelines sequentially
        await pushMultiEntryWizardPipeline();
    }
}

async function pushMultiEntryWizardPipeline() {
    try {
        triggerNotificationBanner('success', "Executing secure batch transaction registration upload...");

        // 1. Commit Step 1: Member Profile
        if (wizardMultiEntryStore.member) {
            await fetch(`${API_BASE}/create/member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wizardMultiEntryStore.member)
            });
        }

        // 2. Commit Step 2: Contact Details
        if (wizardMultiEntryStore.contact) {
            await fetch(`${API_BASE}/create/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wizardMultiEntryStore.contact)
            });
        }

        // 3. Commit Arrays: Employment history profiles
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

        // 4. Commit Step 6: Government IDs (if any fields filled out)
        if (wizardMultiEntryStore.governmentid) {
            // Double-check if the profile filled out something since it's skippable
            const hasValues = Object.values(wizardMultiEntryStore.governmentid).some(v => v !== "" && v !== wizardPrimaryTrackingKey);
            if (hasValues) {
                await fetch(`${API_BASE}/create/governmentid`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(wizardMultiEntryStore.governmentid)
                });
            }
        }

        // Complete the pipeline and flush memory caches cleanly
        isWizardMode = false;
        activeTable = 'member';
        fetchLedgerRecords();
        terminateWizardSession();
        triggerNotificationBanner('success', "Full Member relational data stack committed successfully across all live indices!");

    } catch (err) {
        console.error("Batch commit crash transaction failure:", err);
        triggerNotificationBanner('error', "Fatal transaction failure encountered during sequential data persistence.");
    }
}

async function commitSaveTransaction() {
    const dataPayload = {};
    const dateColumns = ['Birth_Date', 'Date_Employed', 'Date_From', 'Date_To', 'Heir_DateBirth'];

    let requiredFieldsMissing = false;
    let missingFieldLabels = []; 
    
    // --- 💡 MONITOR ALIVE OFW SELECTION STATUS ---
    const selectedSubtypeField = document.getElementById('attr-Mem_Subtype');
    const isCurrentlyOfw = selectedSubtypeField && selectedSubtypeField.value.toUpperCase().includes('OFW');
    
    tableStructures[activeTable].forEach(attr => {
        if (['First_time', 'Sex'].includes(attr)) {
            const checkedRadio = document.querySelector(`input[name="attr-${attr}"]:checked`);
            if (checkedRadio) {
                dataPayload[attr] = checkedRadio.value;
            } else {
                dataPayload[attr] = '';
            }
        } else {
            const inputField = document.getElementById(`attr-${attr}`);
            if (inputField) {
                let val = inputField.value;
                if (typeof val === 'string' && inputField.tagName.toLowerCase() === 'input' && inputField.type === 'text') {
                    val = val.trim().toUpperCase();
                }
                if (attr === 'Mem_Subtype' && inputField.value === 'OTHERS') {
                    const customOthersField = document.getElementById('attr-Mem_Subtype-others');
                    if (customOthersField && customOthersField.value.trim() !== '') {
                        val = customOthersField.value.trim().toUpperCase();
                    }
                }
                if (dateColumns.includes(attr)) {
                    if (!val) {
                        dataPayload[attr] = '';
                    } else {
                        try {
                            const parsedDate = new Date(val);
                            dataPayload[attr] = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split('T')[0] : val;
                        } catch (e) { dataPayload[attr] = val; }
                    }
                } else {
                    dataPayload[attr] = val;
                }
            } else {
                dataPayload[attr] = '';
            }
        }
        
        // --- 🔒 MODE-AWARE CONDITIONAL VALIDATION CORE ---
        let isFieldStrictlyRequired = requiredFieldsConfig[activeTable].includes(attr);
        
        // Dynamically append requirement rules if the member profile is an active OFW
        if (activeTable === 'member' && isCurrentlyOfw && ['Type_Work', 'Type_Country'].includes(attr)) {
            isFieldStrictlyRequired = true;
        }

        if (isFieldStrictlyRequired) {
            const targetDOMElement = document.getElementById(`attr-${attr}`) || document.querySelector(`input[name="attr-${attr}"]`);
            
            let isFieldHidden = false;
            if (targetDOMElement) {
                // Safeguard against hidden container wrappers
                const layoutWrapper = targetDOMElement.closest('#grid-row-wrapper-Type_Work, #grid-row-wrapper-Type_Country');
                if (layoutWrapper && (layoutWrapper.style.display === 'none' || layoutWrapper.style.getPropertyValue('display') === 'none')) {
                    isFieldHidden = true;
                }
            } else if (!isWizardMode) {
                isFieldHidden = true;
            }

            if (!dataPayload[attr] && !isFieldHidden) {
                requiredFieldsMissing = true;
                missingFieldLabels.push(attr.replace(/_/g, ' '));
            }
        }
    });

    if (isWizardMode && wizardPrimaryTrackingKey !== null && tableStructures[activeTable].includes('Pagibig_ID')) {
        dataPayload['Pagibig_ID'] = wizardPrimaryTrackingKey;
    }

    if (requiredFieldsMissing) {
        if (isWizardMode && ['employment', 'prevemployment', 'heir'].includes(activeTable)) {
            const cacheHasItems = wizardMultiEntryStore[activeTable].length > 0;
            if (cacheHasItems) {
                advanceWizardStepEngine();
                return;
            }
        }
        triggerNotificationBanner('error', `Missing Required Fields: ${missingFieldLabels.join(', ')}`);
        return;
    }

    // ==========================================================================
    // 🔀 PATH 1: FULL MEMBER MULTI-STEP WIZARD MODE TRACK (CACHE & ADVANCE)
    // ==========================================================================
    if (isWizardMode) {
        if (activeTable === 'member') {
            wizardPrimaryTrackingKey = dataPayload['Pagibig_ID'];
            wizardMultiEntryStore.member = dataPayload;
            advanceWizardStepEngine();
        } else if (activeTable === 'contact') {
            wizardMultiEntryStore.contact = dataPayload;
            advanceWizardStepEngine();
        } else if (['employment', 'prevemployment', 'heir'].includes(activeTable)) {
            wizardMultiEntryStore[activeTable].push(dataPayload);
            advanceWizardStepEngine();
        } else if (activeTable === 'governmentid') {
            wizardMultiEntryStore.governmentid = dataPayload;
            advanceWizardStepEngine(); 
        }
        return; 
    }

    // ==========================================================================
    // 🔀 PATH 2: SINGLE TABLE MODE TRACK (DIRECT LIVE REST API INSERT)
    // ==========================================================================
    const isEditMode = workingRecordId !== null;
    const targetUrl = isEditMode ? `${API_BASE}/update/${activeTable}?${workingRecordId}` : `${API_BASE}/create/${activeTable}`;
    
    if (!isEditMode && tableStructures[activeTable].includes('Pagibig_ID') && !dataPayload['Pagibig_ID']) {
        triggerNotificationBanner('error', "Validation Blocked: A valid Pagibig_ID reference structure is mandatory.");
        return;
    }

    try {
        const response = await fetch(targetUrl, {
            method: isEditMode ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataPayload)
        });
        
        const result = await response.json();
        if (result.success) {
            fetchLedgerRecords();
            closeCrudModal();
            clearFormCache();
            triggerNotificationBanner('success', isEditMode ? "Changes saved successfully!" : "Record added successfully into this table matrix!");
        } else {
            triggerNotificationBanner('error', `Server Rejected: ${result.error}`);
        }
    } catch (networkError) {
        console.error("Single-row insert network failure:", networkError);
        triggerNotificationBanner('error', "Communication error with administrative endpoint database.");
    }
}

async function fetchLedgerRecords() {
    const response = await fetch(`${API_BASE}/table/${activeTable}`);
    const rows = await response.json();
    
    const head = document.getElementById('ledger-header-target');
    const body = document.getElementById('ledger-body-target');
    head.innerHTML = '';
    body.innerHTML = '';
    
    const primaryColumns = Object.keys(rows[0] || {});
    
    if (!rows || rows.length === 0 || primaryColumns.length === 0) {
        const fallbackHeaders = tableStructures[activeTable];
        let headerString = '<tr>';
        fallbackHeaders.forEach(c => headerString += `<th>${c}</th>`);
        headerString += '<th>Actions</th></tr>'; 
        head.innerHTML = headerString;

        body.innerHTML = `<tr><td colspan="100%" style="text-align:center; padding:40px; color:#64748b; font-weight:500;">
            No records found inside the <b>${activeTable}</b> table matrix. Click "Add Record Row" to populate your database!
        </td></tr>`;
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
        
        if (typeof cellValue === 'string' && cellValue.includes('T') && !isNaN(Date.parse(cellValue))) {
            cellValue = cellValue.split('T')[0]; 
        }

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
    
    buildFormWorkspace().then(() => {
        tableStructures[activeTable].forEach(attr => {
            let val = rowData[attr] !== null ? rowData[attr] : '';
            if (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val))) {
                val = val.split('T')[0];
            }

            if (['First_time', 'Sex'].includes(attr)) {
                const radioEl = document.getElementById(`attr-${attr}-${val}`);
                if (radioEl) radioEl.checked = true;
            } else {
                const inputField = document.getElementById(`attr-${attr}`);
                if (inputField) {
                    if (attr === 'Mem_Type') {
                        inputField.value = val;
                        evaluateSubtypeConditionalDropdowns(val);
                    } 
                    else if (attr === 'Mem_Subtype') {
                        const containsOption = Array.from(inputField.options).some(opt => opt.value === val);
                        if (containsOption) {
                            inputField.value = val;
                        } else if (val !== '') {
                            inputField.value = 'OTHERS';
                            evaluateOthersSpecificationField(inputField, 'Mem_Subtype');
                            const customField = document.getElementById('attr-Mem_Subtype-others');
                            if (customField) customField.value = val;
                        }
                    } else {
                        inputField.value = val;
                    }
                }
            }
        });
        
        document.getElementById('modal-title-intent').innerText = `Modify Record Entry`;
        openCrudModal();
    });
}

function executeRowRemoval(keyParamString) {
    const promptString = "Warning: Deleting this transaction line row will permanently purge values from the live schema database ledger. Are you sure you want to continue?";
    
    executeProtectedConfirmationPrompt(promptString, async () => {
        const response = await fetch(`${API_BASE}/delete/${activeTable}?${keyParamString}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            fetchLedgerRecords();
            triggerNotificationBanner('success', "Record removed from database.");
        } else {
            triggerNotificationBanner('error', `Delete operation failed: ${result.error}`);
        }
    });
}

function openCrudModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeCrudModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    clearFormCache();
}

function executeLedgerSearchFilter() {
    const searchVal = document.getElementById('ledger-search-input').value.toLowerCase();
    const tableBody = document.getElementById('ledger-body-target');
    const rows = tableBody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        if (rows[i].cells.length <= 1 && rows[i].querySelector('td[colspan]')) continue;

        let rowContainsMatch = false;
        for (let j = 0; j < rows[i].cells.length - 1; j++) {
            const cellText = rows[i].cells[j].textContent || rows[i].cells[j].innerText;
            if (cellText.toLowerCase().includes(searchVal)) {
                rowContainsMatch = true;
                break; 
            }
        }

        if (rowContainsMatch) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
}

function triggerNotificationBanner(messageType, descriptionText) {
    const container = document.getElementById('toast-notification-container');
    const toastNode = document.createElement('div');
    
    let backgroundTheme = '#f0fdf4'; let frameBorder = '#bbf7d0'; let headerColor = '#166534'; let statusIcon = 'check_circle';
    if (messageType === 'error') {
        backgroundTheme = '#fef2f2'; frameBorder = '#fca5a5'; headerColor = '#991b1b'; statusIcon = 'error';
    }

    toastNode.className = 'toast-alert-card';
    toastNode.style.cssText = `display:flex; align-items:center; gap:12px; padding:14px 18px; margin-bottom:10px; background:${backgroundTheme}; border:1px solid ${frameBorder}; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.05); color:${headerColor}; font-size:13.5px; font-weight:500; min-width:280px; position:relative; animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);`;

    toastNode.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:20px;">${statusIcon}</span>
        <span style="flex:1; padding-right:15px;">${descriptionText}</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:inherit; font-size:18px; font-weight:700; cursor:pointer; padding:0; line-height:1;">&times;</button>
    `;

    container.appendChild(toastNode);
    setTimeout(() => { if (toastNode.parentElement) toastNode.remove(); }, 4500);
}

function executeProtectedConfirmationPrompt(promptString, affirmativeCallback) {
    const overlay = document.getElementById('confirm-modal-overlay');
    document.getElementById('confirm-modal-message').innerText = promptString;
    overlay.classList.remove('hidden');

    const btnYes = document.getElementById('confirm-btn-yes');
    const btnNo = document.getElementById('confirm-btn-no');

    const clearPromptSession = () => { overlay.classList.add('hidden'); btnYes.onclick = null; btnNo.onclick = null; };

    btnNo.onclick = clearPromptSession;
    btnYes.onclick = () => { affirmativeCallback(); clearPromptSession(); };
}

function openHelpModal() { document.getElementById('help-modal-overlay').classList.remove('hidden'); }
function closeHelpModal() { document.getElementById('help-modal-overlay').classList.add('hidden'); }

function evaluateSubtypeConditionalDropdowns(selectedType) {
    const wrapper = document.getElementById('subtype-conditional-wrapper');
    if (!wrapper) return;

    if (selectedType === 'MANDATORY') {
        wrapper.innerHTML = `
            <select id="attr-Mem_Subtype" onchange="evaluateOthersSpecificationField(this, 'Mem_Subtype'); evaluateOfwFieldsVisibility(this.value);">
                <option value="" selected disabled>-- Select Mandatory Subtype --</option>
                <option value="EMPLOYED">EMPLOYED</option>
                <option value="OVERSEAS FILIPINO WORKER (OFW)">OVERSEAS FILIPINO WORKER (OFW)</option>
                <option value="SELF-EMPLOYED">SELF-EMPLOYED</option>
                <option value="OTHERS">OTHERS (SPECIFY)</option>
            </select>
            <input type="text" id="attr-Mem_Subtype-others" placeholder="Please specify dynamic category..." style="display:none; margin-top:8px;">
        `;
    } else if (selectedType === 'VOLUNTARY') {
        wrapper.innerHTML = `
            <select id="attr-Mem_Subtype" onchange="evaluateOthersSpecificationField(this, 'Mem_Subtype'); evaluateOfwFieldsVisibility(this.value);">
                <option value="" selected disabled>-- Select Voluntary Subtype --</option>
                <option value="EMPLOYED">EMPLOYED</option>
                <option value="INDIVIDUAL PAYOR">INDIVIDUAL PAYOR</option>
                <option value="OTHERS">OTHERS (SPECIFY)</option>
            </select>
            <input type="text" id="attr-Mem_Subtype-others" placeholder="Please specify dynamic category..." style="display:none; margin-top:8px;">
        `;
    }
    evaluateOfwFieldsVisibility("");
}

function evaluateOthersSpecificationField(selectElement, elementAttributeKey) {
    const textInputField = document.getElementById(`attr-${elementAttributeKey}-others`);
    if (!textInputField) return;
    
    if (selectElement.value === 'OTHERS') {
        textInputField.style.display = "block";
        textInputField.focus();
    } else {
        textInputField.style.display = "none";
        textInputField.value = ""; 
    }
}

document.body.addEventListener('keydown', (event) => {
    const formGridContainer = document.getElementById('form-grid-target');
    if (!formGridContainer || !formGridContainer.contains(event.target)) return;

    if (event.key === 'Enter') {
        // Prevent accidental enter sumbissions when typing inside radio clusters or specific buttons
        if(event.target.type === 'radio' || event.target.tagName.toLowerCase() === 'button') return;
        
        event.preventDefault();

        const formFields = Array.from(
            formGridContainer.querySelectorAll('input:not([disabled]), select:not([disabled])')
        ).filter(el => el.style.display !== 'none' && el.type !== 'hidden');

        const activeIndex = formFields.indexOf(document.activeElement);

        if (activeIndex !== -1) {
            if (activeIndex < formFields.length - 1) {
                formFields[activeIndex + 1].focus();
                if (formFields[activeIndex + 1].select) {
                    formFields[activeIndex + 1].select();
                }
            } else {
                console.log("Last input field reached. Executing live transaction commit save...");
                commitSaveTransaction();
            }
        }
    }
});

function evaluateOfwFieldsVisibility(selectedSubtype) {
    const rowWork = document.getElementById('grid-row-wrapper-Type_Work');
    const rowCountry = document.getElementById('grid-row-wrapper-Type_Country');
    
    if (!rowWork || !rowCountry) return;

    // Grab the actual text label elements above the inputs
    const labelWork = rowWork.querySelector('label');
    const labelCountry = rowCountry.querySelector('label');

    if (selectedSubtype && selectedSubtype.toUpperCase().includes('OFW')) {
        rowWork.style.display = "flex";
        rowCountry.style.display = "flex";
        
        // Dynamic Frontend Alert: Append the red asterisk to the labels in the UI
        if (labelWork) labelWork.innerHTML = `Type Work <span class="required-asterisk">*</span>`;
        if (labelCountry) labelCountry.innerHTML = `Type Country <span class="required-asterisk">*</span>`;
    } else {
        rowWork.style.display = "none";
        rowCountry.style.display = "none";

        // Remove the asterisks when hidden or non-applicable
        if (labelWork) labelWork.innerHTML = `Type Work`;
        if (labelCountry) labelCountry.innerHTML = `Type Country`;

        const inputWork = document.getElementById('attr-Type_Work');
        const inputCountry = document.getElementById('attr-Type_Country');
        if (inputWork) inputWork.value = "";
        if (inputCountry) inputCountry.value = "";
    }
}

function toggleSidebarMenuLayout() {
    const sidebar = document.getElementById('main-sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    
    if (!sidebar) return;
    sidebar.classList.toggle('minimized');
    
    if (sidebar.classList.contains('minimized')) {
        toggleIcon.innerText = 'menu';
    } else {
        toggleIcon.innerText = 'menu_open';
    }
}