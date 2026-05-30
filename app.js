const API_BASE = 'http://localhost:3000/api';
let activeTable = 'member'; // 💡 CHANGED: Lowercase 'member' instead of 'Member'
let workingRecordId = null; // Tracks the current record ID being modified, if any
// Global State Tracking Variables for Multi-Step Transaction Flow Mechanisms
let isWizardMode = false;
const wizardSteps = ['member', 'contact', 'employment', 'prevemployment', 'heir', 'governmentid'];
let wizardCurrentStepIndex = 0;
let wizardPrimaryTrackingKey = null; // Caches Pagibig_ID dynamically to inject into downstream tables
let interruptedWizardState = null;   // Caches user's progress if they leave to register an employer

// Programmatic mappings linking dynamic user inputs directly to file column keys
const tableStructures = {
    member: ['Pagibig_ID', 'Regis_num', 'Occ_Stats', 'First_time', 'Mem_Type', 'Mem_Subtype', 'Type_Work', 'Type_Country', 'Mem_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'MemCert_Name', 'Birth_Date', 'Place_Birth', 'Sex', 'Height', 'Weight', 'Marital_Status', 'Citizenship', 'Facial_Features', 'Frequency_Payment'],
    contact: ['Pagibig_ID', 'Cell_Num', 'Home_Num', 'Business_Direct', 'Business_Trunk', 'Email_Address', 'Perm_Address', 'Present_Address', 'Pref_Mail_Address'],
    employment: ['Pagibig_ID', 'Employer_ID', 'Employment_Status', 'Occupation', 'Office_Assignment', 'Date_Employed', 'Monthly_Income'],
    prevemployment: ['Pagibig_ID', 'Employer_ID', 'Date_From', 'Date_To', 'PrevOffice_Assignment'], // 💡 FIXED: Lowercase key
    heir: ['Pagibig_ID', 'Heir_Code', 'Heir_Name', 'Relationship', 'Heir_DateBirth'],                     // 💡 FIXED: Lowercase key
    governmentid: ['Pagibig_ID', 'TIN_Num', 'SSS_Num', 'CRN', 'EM_Num', 'AFP_PNP_Num', 'Deped_Code'],     // 💡 FIXED: Lowercase key
    employer: ['Employer_ID', 'Employer_Name', 'Employer_Address']                                      // 💡 FIXED: Lowercase key
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

    // Clear the search bar input when jumping to a new active table segment
    const searchInput = document.getElementById('ledger-search-input');
    if (searchInput) searchInput.value = '';
}

// Intercept Add Button to Kickstart Unified Wizard Instead of Fragmented Single Forms
function initiateNewMemberWizard() {
    isWizardMode = true;
    wizardCurrentStepIndex = 0;
    wizardPrimaryTrackingKey = null;
    interruptedWizardState = null;
    
    activeTable = wizardSteps[wizardCurrentStepIndex];
    workingRecordId = null;
    
    document.getElementById('modal-title-intent').innerText = "Step 1: Account Identification Registration (Member Profile)";
    openCrudModal();
    buildFormWorkspace();
}

// Intercept Normal Modal Close to Clean Form States Safely
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
        let icon = 'circle';
        
        if (idx === wizardCurrentStepIndex) {
            statusClass += ' active-step';
        } else if (idx < wizardCurrentStepIndex) {
            statusClass += ' completed-step';
        }
        
        progressHtml += `
            <div class="${statusClass}">
                <span class="material-symbols-outlined">${icon}</span>
                <span>${step}</span>
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

// Redirect and Route to Employer View instantly when an admin encounters unlisted registry data
function suspendWizardForEmployerFiling() {
    // Cache current progress state inside memory registers before hopping context views
    interruptedWizardState = {
        wizardCurrentStepIndex: wizardCurrentStepIndex,
        wizardPrimaryTrackingKey: wizardPrimaryTrackingKey,
        cachedFormData: {}
    };
    
    // Save transient unsaved entries typed by user so far on this step
    tableStructures[activeTable].forEach(attr => {
        const field = document.getElementById(`attr-${attr}`);
        if (field) interruptedWizardState.cachedFormData[attr] = field.value;
    });
    
    // Temporarily switch context to the Employer registry view pipeline
    isWizardMode = false;
    activeTable = 'employer';
    workingRecordId = null;
    
    // Sync matching tab highlight styles on the dashboard sidebar dynamically
    document.querySelectorAll('#table-tabs li').forEach(el => {
        if(el.innerText.includes('Employer')) el.classList.add('selected');
        else el.classList.remove('selected');
    });
    
    document.getElementById('modal-title-intent').innerText = "Interrupted Step Path: Provision New Employer Reference Key";
    buildFormWorkspace();
}

// Refined Build Workspace handling rendering switches cleanly
async function buildFormWorkspace() {
    const box = document.getElementById('form-grid-target');
    box.innerHTML = '';
    
    const isNewRecord = workingRecordId === null;
    
    // Calculate auto-increment alpha keys securely for Employers
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

    // Auto-increment numeric structures for unique Heir codes
    let nextHeirCode = 'H001';
    if (activeTable === 'heir' && isNewRecord) {
        try {
            const response = await fetch(`${API_BASE}/table/heir`);
            const rows = await response.json();
            let highestHeirNum = 0;
            rows.forEach(r => {
                const match = (r.Heir_Code || '').match(/^H(\d+)$/i);
                if (match) highestHeirNum = Math.max(highestHeirNum, parseInt(match[1], 10));
            });
            nextHeirCode = `H${String(highestHeirNum + 1).padStart(3, '0')}`;
        } catch(e) { nextHeirCode = 'H001'; }
    }

    // Load available employer dynamic row sets for drop-downs
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

    // Structural generation pass looping properties down into specific elements
    tableStructures[activeTable].forEach(attr => {
        if (attr === 'id') return;
        let labelName = attr.replace(/_/g, ' ');
        let inputHtml = '';

        switch (attr) {
            case 'Occ_Stats':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Status --</option><option value="UNEMPLOYED/NOT YET EMPLOYED">UNEMPLOYED / NOT YET EMPLOYED</option><option value="EMPLOYED">EMPLOYED</option></select>`;
                break;
            case 'First_time':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Answer --</option><option value="YES">YES</option><option value="NO">NO</option></select>`;
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
                inputHtml = `<input type="text" id="attr-${attr}" maxlength="30" autocomplete="off">`;
                break;
            case 'Sex':
                inputHtml = `<select id="attr-${attr}"><option value="" selected disabled>-- Select Sex --</option><option value="M">M</option><option value="F">F</option></select>`;
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
                const numericColumns = ['Pagibig_ID', 'Regis_num', 'Height', 'Weight', 'Monthly_Income', 'TIN_Num', 'SSS_Num', 'CRN', 'EM_Num', 'AFP_PNP_Num', 'Deped_Code'];
                const dateColumns = ['Birth_Date', 'Date_Employed', 'Date_From', 'Date_To', 'Heir_DateBirth'];

                if (numericColumns.includes(attr)) inputType = 'number';
                if (dateColumns.includes(attr)) inputType = 'date';

                // Truncation configurations mapping structural maximum database bounds
                if (inputType === 'text') {
                    if (['Mem_Name', 'MemCert_Name', 'Fat_Name', 'Mot_Name', 'Spouse_Name', 'Type_Country', 'Place_Birth', 'Employer_Name', 'Heir_Name'].includes(attr)) extraAttributes = 'maxlength="30"'; 
                    else if (['Citizenship', 'Email_Address'].includes(attr)) extraAttributes = 'maxlength="20"'; 
                    else if (['Perm_Address', 'Present_Address', 'Employer_Address'].includes(attr)) extraAttributes = 'maxlength="80"'; 
                    else if (attr === 'Cell_Num') extraAttributes = 'maxlength="25"'; 
                    else if (['Home_Num', 'Business_Direct', 'Business_Trunk', 'Relationship'].includes(attr)) extraAttributes = 'maxlength="15"'; 
                    else if (attr === 'Facial_Features') extraAttributes = 'maxlength="25"';
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

        // Wrap the entire column grid cell so we can hide the field label and input together
        let wrapperIdHtml = '';
        if (attr === 'Type_Work' || attr === 'Type_Country') {
            wrapperIdHtml = ` id="grid-row-wrapper-${attr}" style="display: none;"`;
        }

        box.innerHTML += `
            <div${wrapperIdHtml}>
                <label for="attr-${attr}">${labelName}</label>
                ${inputHtml}
            </div>`;
    });

    // Enforce dynamic key binding inheritance across sequential wizard steps automatically
    if (isWizardMode && wizardPrimaryTrackingKey !== null && activeTable !== 'member') {
        const primaryIdField = document.getElementById('attr-Pagibig_ID');
        if (primaryIdField) {
            primaryIdField.value = wizardPrimaryTrackingKey;
            primaryIdField.disabled = true; // Hard-lock field view context so reference stays bound
        }
    }

    // Append standard progress layout metrics if tracking active wizard sessions
    if (isWizardMode) {
        injectWizardProgressIndicator();
        // Dynamically alter footer operational labels depending on registration steps reached
        const nextButton = document.querySelector('.modal-footer .btn-primary');
        if (nextButton) {
            nextButton.innerText = (wizardCurrentStepIndex === wizardSteps.length - 1) ? "Finish & Save" : "Next Step →";
        }
    } else if (activeTable === 'employer' && interruptedWizardState !== null) {
        const saveButton = document.querySelector('.modal-footer .btn-primary');
        if (saveButton) saveButton.innerText = "Commit Employer & Return";
    }
}

// Central Commits Processing Pipeline Engine Customization
// Central Commits Processing Pipeline Engine Customization
async function commitSaveTransaction() {
    const dataPayload = {};
    const dateColumns = ['Birth_Date', 'Date_Employed', 'Date_From', 'Date_To', 'Heir_DateBirth'];

    tableStructures[activeTable].forEach(attr => {
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
        }
    });

    // Inject active Primary Key dynamically back into the current row if field is locked/disabled
    if (isWizardMode && wizardPrimaryTrackingKey !== null && tableStructures[activeTable].includes('Pagibig_ID')) {
        dataPayload['Pagibig_ID'] = wizardPrimaryTrackingKey;
    }

    const isEditMode = workingRecordId !== null;
    const targetUrl = isEditMode ? `${API_BASE}/update/${activeTable}?${workingRecordId}` : `${API_BASE}/create/${activeTable}`;
    
    // Validate entry inputs before executing database submission
    if (!isEditMode && tableStructures[activeTable].includes('Pagibig_ID') && !dataPayload['Pagibig_ID']) {
        triggerNotificationBanner('error', "Validation Blocked: A valid Pagibig_ID reference structure is mandatory.");
        return;
    }

    const response = await fetch(targetUrl, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataPayload)
    });
    
    const result = await response.json();
    if (result.success) {
        // 💡 FIX: Only refresh the background data list if we are NOT mid-wizard, or if we just finished it.
        // This stops fetchLedgerRecords from throwing you out of your popups prematurely!
        if (!isWizardMode) {
            fetchLedgerRecords();
        }
        
        // 🔀 CASE A: Interrupted Route Switch. User just saved an Employer. Return them to their active Wizard Step!
        if (!isWizardMode && activeTable === 'employer' && interruptedWizardState !== null) {
            triggerNotificationBanner('success', "Employer logged! Resuming member registration wizard.");
            
            // Restore wizard positioning properties from snapshot cache references
            isWizardMode = true;
            wizardCurrentStepIndex = interruptedWizardState.wizardCurrentStepIndex;
            wizardPrimaryTrackingKey = interruptedWizardState.wizardPrimaryTrackingKey;
            const contextStepData = interruptedWizardState.cachedFormData;
            
            activeTable = wizardSteps[wizardCurrentStepIndex];
            interruptedWizardState = null;
            
            // Rebuild the wizard layout view and auto-fill any previously input data
            await buildFormWorkspace();
            Object.keys(contextStepData).forEach(key => {
                const el = document.getElementById(`attr-${key}`);
                if (el) el.value = contextStepData[key];
            });
            
            document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Data Record Logging Entry (${activeTable})`;
            return;
        }

        // 🔀 CASE B: Multi-Step Wizard Engine Processing Loop Navigation Pathing Rules
        if (isWizardMode) {
            // If we just successfully submitted Step 1, lock down the generated Pagibig_ID key to use everywhere else
            if (wizardCurrentStepIndex === 0) {
                wizardPrimaryTrackingKey = dataPayload['Pagibig_ID'];
            }
            
            if (wizardCurrentStepIndex < wizardSteps.length - 1) {
                // Advance onward securely to the very next table structure step
                wizardCurrentStepIndex++;
                activeTable = wizardSteps[wizardCurrentStepIndex];
                workingRecordId = null;
                
                triggerNotificationBanner('success', `Step completed! Advancing to ${activeTable} metrics entry.`);
                await buildFormWorkspace(); // Ensure async functions resolve fully before writing text strings
                document.getElementById('modal-title-intent').innerText = `Step ${wizardCurrentStepIndex + 1}: Unified Registration (${activeTable})`;
            } else {
                // Final step reached! Refresh data background view, finish, and close out the transaction completely.
                isWizardMode = false;
                activeTable = 'member'; // Snap active grid focus cleanly back onto primary registration layout
                fetchLedgerRecords();
                terminateWizardSession();
                triggerNotificationBanner('success', "Full Member relational data stack created successfully across all schema matrices!");
            }
        } else {
            // Standard individual standalone form processing paths (like quick edits)
            closeCrudModal();
            clearFormCache();
            triggerNotificationBanner('success', isEditMode ? "Changes saved successfully!" : "Record added successfully!");
        }
    } else {
        triggerNotificationBanner('error', `Transaction rejected: ${result.error}`);
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
        headerString += '<th>Actions</th></tr>'; // Clear out inline alignments
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
        
        // If the value is an ISO date timestamp string, clean it up!
        if (typeof cellValue === 'string' && cellValue.includes('T') && !isNaN(Date.parse(cellValue))) {
            cellValue = cellValue.split('T')[0]; // Grabs only the 'YYYY-MM-DD' part
        }

        rowString += `<td>${cellValue}</td>`;
    });
        
        // Dynamic key serializing string generator matching complex rows safely
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
    
    // First, reconstruct form nodes to ensure fields are fresh
    buildFormWorkspace().then(() => {
        tableStructures[activeTable].forEach(attr => {
            const inputField = document.getElementById(`attr-${attr}`);
            if (inputField) {
                let val = rowData[attr] !== null ? rowData[attr] : '';
                
                if (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val))) {
                    val = val.split('T')[0];
                }

                // Synchronize parent dependency fields first
                if (attr === 'Mem_Type') {
                    inputField.value = val;
                    evaluateSubtypeConditionalDropdowns(val);
                } 
                else if (attr === 'Mem_Subtype') {
                    // Check if value is native or custom
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

function clearFormCache() {
    workingRecordId = null;
    if (!isWizardMode) {
        isWizardMode = false;
        wizardPrimaryTrackingKey = null;
        interruptedWizardState = null;
    }
    tableStructures[activeTable].forEach(attr => {
        const inputField = document.getElementById(`attr-${attr}`);
        if (inputField) inputField.value = '';
    });
    if (!isWizardMode) {
        document.getElementById('modal-title-intent').innerText = "Add Direct Transaction Log Entry";
    }
}

// Dynamic Client-Side Multi-Column Search Pattern Filtering Engine
function executeLedgerSearchFilter() {
    const searchVal = document.getElementById('ledger-search-input').value.toLowerCase();
    const tableBody = document.getElementById('ledger-body-target');
    const rows = tableBody.getElementsByTagName('tr');

    // Loop through every single row item generated in the ledger target
    for (let i = 0; i < rows.length; i++) {
        // Skip fallback rows (like the "No records found" alert message row)
        if (rows[i].cells.length <= 1 && rows[i].querySelector('td[colspan]')) continue;

        let rowContainsMatch = false;
        
        // Loop through every cell column in the current row (excluding the trailing Actions button cell)
        for (let j = 0; j < rows[i].cells.length - 1; j++) {
            const cellText = rows[i].cells[j].textContent || rows[i].cells[j].innerText;
            
            if (cellText.toLowerCase().includes(searchVal)) {
                rowContainsMatch = true;
                break; // Stop checking this row early if a cell matches!
            }
        }

        // Toggle visibility structural states instantly without rewriting DOM states
        if (rowContainsMatch) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
}

// --- LIVE SYSTEM TOAST STACK NOTIFICATION PATTERN ---
function triggerNotificationBanner(messageType, descriptionText) {
    const container = document.getElementById('toast-notification-container');
    const toastNode = document.createElement('div');
    
    // Set explicit colors based on message status parameters
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

    // Auto-destruct notification box securely after 4.5 seconds automatically if left open
    setTimeout(() => { if (toastNode.parentElement) toastNode.remove(); }, 4500);
}

// --- CUSTOM INTERACTIVE MODAL PROMPT CALLBACK HANDLER ---
function executeProtectedConfirmationPrompt(promptString, affirmativeCallback) {
    const overlay = document.getElementById('confirm-modal-overlay');
    document.getElementById('confirm-modal-message').innerText = promptString;
    overlay.classList.remove('hidden');

    const btnYes = document.getElementById('confirm-btn-yes');
    const btnNo = document.getElementById('confirm-btn-no');

    // Clean up older event listeners to avoid execution leaks
    const clearPromptSession = () => { overlay.classList.add('hidden'); btnYes.onclick = null; btnNo.onclick = null; };

    btnNo.onclick = clearPromptSession;
    btnYes.onclick = () => { affirmativeCallback(); clearPromptSession(); };
}

// --- PORTAL MANUAL RESOURCE WINDOW HANDLERS ---
function openHelpModal() { document.getElementById('help-modal-overlay').classList.remove('hidden'); }
function closeHelpModal() { document.getElementById('help-modal-overlay').classList.add('hidden'); }

// Switches dynamic structural options based on parent Membership parameters
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
    
    // Safety check: Run evaluation immediately to keep fields hidden initially
    evaluateOfwFieldsVisibility("");
}

// Toggles textbox visibility when an "OTHERS" option is selected
function evaluateOthersSpecificationField(selectElement, elementAttributeKey) {
    const textInputField = document.getElementById(`attr-${elementAttributeKey}-others`);
    if (!textInputField) return;
    
    if (selectElement.value === 'OTHERS') {
        textInputField.style.display = "block";
        textInputField.focus();
    } else {
        textInputField.style.display = "none";
        textInputField.value = ""; // Empty string out to clear text residue cache safely
    }
}

// --- ACCELERATED KEYBOARD ENTER-FOCUS NAVIGATION TRACKER ---
// 💡 CHANGED: Listen on document.body instead of form-grid-target directly
document.body.addEventListener('keydown', (event) => {
    // Only intercept keydowns if the user presses enter inside our form grid container
    const formGridContainer = document.getElementById('form-grid-target');
    if (!formGridContainer || !formGridContainer.contains(event.target)) return;

    if (event.key === 'Enter') {
        event.preventDefault();

        // Gather all visible, enabled input elements inside the active form grid panel
        const formFields = Array.from(
            formGridContainer.querySelectorAll('input:not([disabled]), select:not([disabled])')
        ).filter(el => el.style.display !== 'none' && el.type !== 'hidden');

        // Find where the user is currently typing
        const activeIndex = formFields.indexOf(document.activeElement);

        if (activeIndex !== -1) {
            if (activeIndex < formFields.length - 1) {
                // ➡️ Move focus to the very next active input field box smoothly
                formFields[activeIndex + 1].focus();
                
                if (formFields[activeIndex + 1].select) {
                    formFields[activeIndex + 1].select();
                }
            } else {
                // 💾 User pressed enter on the LAST field -> Automatically fire the save transaction action button!
                console.log("Last input field reached. Executing live transaction commit save...");
                commitSaveTransaction();
            }
        }
    }
});

// Automatically toggles Type_Work and Type_Country fields based on OFW status
function evaluateOfwFieldsVisibility(selectedSubtype) {
    const rowWork = document.getElementById('grid-row-wrapper-Type_Work');
    const rowCountry = document.getElementById('grid-row-wrapper-Type_Country');
    
    if (!rowWork || !rowCountry) return;

    // Check if the selected category contains "OVERSEAS FILIPINO WORKER" or "OFW"
    if (selectedSubtype && selectedSubtype.toUpperCase().includes('OFW')) {
        rowWork.style.display = "flex";
        rowCountry.style.display = "flex";
    } else {
        // Snaps them to display none completely, hiding both labels and inputs
        rowWork.style.display = "none";
        rowCountry.style.display = "none";

        // Reset underlying field values so unwanted data isn't saved accidentally
        const inputWork = document.getElementById('attr-Type_Work');
        const inputCountry = document.getElementById('attr-Type_Country');
        if (inputWork) inputWork.value = "";
        if (inputCountry) inputCountry.value = "";
    }
}