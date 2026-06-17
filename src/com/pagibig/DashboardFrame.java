package com.pagibig;

import java.awt.*;
import java.util.regex.Pattern;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.TableRowSorter;

public class DashboardFrame extends JFrame {
    private final DataStore dataStore;

    private final DefaultTableModel memberModel;
    private final DefaultTableModel contactModel;
    private final DefaultTableModel employmentModel;
    private final DefaultTableModel previousEmploymentModel;
    private final DefaultTableModel heirModel;
    private final DefaultTableModel governmentIdModel;
    private final DefaultTableModel employerModel;

    private final JTable memberTable;
    private final JTable contactTable;
    private final JTable employmentTable;
    private final JTable previousEmploymentTable;
    private final JTable heirTable;
    private final JTable governmentIdTable;
    private final JTable employerTable;

    private final TableRowSorter<DefaultTableModel> memberSorter;
    private final TableRowSorter<DefaultTableModel> contactSorter;
    private final TableRowSorter<DefaultTableModel> employmentSorter;
    private final TableRowSorter<DefaultTableModel> previousEmploymentSorter;
    private final TableRowSorter<DefaultTableModel> heirSorter;
    private final TableRowSorter<DefaultTableModel> governmentIdSorter;
    private final TableRowSorter<DefaultTableModel> employerSorter;

    private final JTextField searchField;
    private final JTabbedPane tabbedPane;

    public DashboardFrame(DataStore dataStore) {
        this.dataStore = dataStore;

        setTitle("Pag-IBIG Fund Admin Dashboard");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(980, 680);
        setLocationRelativeTo(null);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        setContentPane(content);

        JLabel headerLabel = new JLabel("Pag-IBIG Fund Member Database System");
        headerLabel.setFont(new Font("SansSerif", Font.BOLD, 22));

        JButton helpButton = new JButton("Help Desk");
        helpButton.addActionListener(e -> showHelpDialog());
        JButton logoutButton = new JButton("Log Out");
        logoutButton.addActionListener(e -> System.exit(0));

        JPanel headerBar = new JPanel(new BorderLayout(10, 0));
        headerBar.add(headerLabel, BorderLayout.WEST);
        JPanel headerActions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        headerActions.add(helpButton);
        headerActions.add(logoutButton);
        headerBar.add(headerActions, BorderLayout.EAST);

        content.add(headerBar, BorderLayout.NORTH);

        searchField = new JTextField();
        searchField.setColumns(28);
        searchField.setToolTipText("Search the active table");
        searchField.addActionListener(e -> applySearchFilter());

        JButton clearSearch = new JButton("Clear");
        clearSearch.addActionListener(e -> {
            searchField.setText("");
            applySearchFilter();
        });

        JPanel searchPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        searchPanel.add(new JLabel("Search:"));
        searchPanel.add(searchField);
        searchPanel.add(clearSearch);
        content.add(searchPanel, BorderLayout.SOUTH);

        memberModel = new DefaultTableModel(new Object[]{"Pagibig ID", "Name", "Type", "Sex", "Birth Date", "Citizenship"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        contactModel = new DefaultTableModel(new Object[]{"Pagibig ID", "Cell Num", "Home Num", "Business Direct", "Business Trunk", "Email", "Perm Address", "Present Address", "Preferred Mail"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        employmentModel = new DefaultTableModel(new Object[]{"Pagibig ID", "Employer ID", "Status", "Occupation", "Office", "Date Employed", "Income"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        previousEmploymentModel = new DefaultTableModel(new Object[]{"Pagibig ID", "Employer ID", "Date From", "Date To", "Prev Office"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        heirModel = new DefaultTableModel(new Object[]{"Pagibig ID", "Heir Code", "Heir Name", "Relationship", "Birth Date"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        governmentIdModel = new DefaultTableModel(new Object[]{"Pagibig ID", "TIN", "SSS", "CRN", "EM Num", "AFP/PNP", "DepEd Code"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
        employerModel = new DefaultTableModel(new Object[]{"Employer ID", "Employer Name", "Address"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };

        memberTable = new JTable(memberModel);
        memberTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        memberSorter = new TableRowSorter<>(memberModel);
        memberTable.setRowSorter(memberSorter);

        contactTable = new JTable(contactModel);
        contactTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        contactSorter = new TableRowSorter<>(contactModel);
        contactTable.setRowSorter(contactSorter);

        employmentTable = new JTable(employmentModel);
        employmentTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        employmentSorter = new TableRowSorter<>(employmentModel);
        employmentTable.setRowSorter(employmentSorter);

        previousEmploymentTable = new JTable(previousEmploymentModel);
        previousEmploymentTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        previousEmploymentSorter = new TableRowSorter<>(previousEmploymentModel);
        previousEmploymentTable.setRowSorter(previousEmploymentSorter);

        heirTable = new JTable(heirModel);
        heirTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        heirSorter = new TableRowSorter<>(heirModel);
        heirTable.setRowSorter(heirSorter);

        governmentIdTable = new JTable(governmentIdModel);
        governmentIdTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        governmentIdSorter = new TableRowSorter<>(governmentIdModel);
        governmentIdTable.setRowSorter(governmentIdSorter);

        employerTable = new JTable(employerModel);
        employerTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        employerSorter = new TableRowSorter<>(employerModel);
        employerTable.setRowSorter(employerSorter);

        tabbedPane = new JTabbedPane();
        tabbedPane.addTab("Member Information", createMemberTab());
        tabbedPane.addTab("Contact Details", createContactTab());
        tabbedPane.addTab("Current Employment", createEmploymentTab());
        tabbedPane.addTab("Previous Employment", createPreviousEmploymentTab());
        tabbedPane.addTab("Beneficiary Registry", createHeirTab());
        tabbedPane.addTab("Government IDs", createGovernmentIdTab());
        tabbedPane.addTab("Employer Registry", createEmployerTab());
        tabbedPane.addChangeListener(e -> applySearchFilter());

        content.add(tabbedPane, BorderLayout.CENTER);

        refreshAllTables();
    }

    private JPanel createMemberTab() {
        return createTablePanel(memberTable, "Member", () -> showMemberDialog(-1), () -> editTableSelection(memberTable, this::showMemberDialog, dataStore.getMembers().size()));
    }

    private JPanel createContactTab() {
        return createTablePanel(contactTable, "Contact", () -> showContactDialog(-1), () -> editTableSelection(contactTable, this::showContactDialog, dataStore.getContacts().size()));
    }

    private JPanel createEmploymentTab() {
        return createTablePanel(employmentTable, "Employment", () -> showEmploymentDialog(-1), () -> editTableSelection(employmentTable, this::showEmploymentDialog, dataStore.getEmployments().size()));
    }

    private JPanel createPreviousEmploymentTab() {
        return createTablePanel(previousEmploymentTable, "Previous Employment", () -> showPreviousEmploymentDialog(-1), () -> editTableSelection(previousEmploymentTable, this::showPreviousEmploymentDialog, dataStore.getPreviousEmployments().size()));
    }

    private JPanel createHeirTab() {
        return createTablePanel(heirTable, "Heir", () -> showHeirDialog(-1), () -> editTableSelection(heirTable, this::showHeirDialog, dataStore.getHeirs().size()));
    }

    private JPanel createGovernmentIdTab() {
        return createTablePanel(governmentIdTable, "Government ID", () -> showGovernmentIdDialog(-1), () -> editTableSelection(governmentIdTable, this::showGovernmentIdDialog, dataStore.getGovernmentIds().size()));
    }

    private JPanel createEmployerTab() {
        return createTablePanel(employerTable, "Employer", () -> showEmployerDialog(-1), () -> editTableSelection(employerTable, this::showEmployerDialog, dataStore.getEmployers().size()));
    }

    private JPanel createTablePanel(JTable table, String label, Runnable addAction, Runnable editAction) {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.add(new JScrollPane(table), BorderLayout.CENTER);

        JButton addButton = new JButton("Add " + label);
        addButton.addActionListener(e -> addAction.run());

        JButton editButton = new JButton("Edit " + label);
        editButton.addActionListener(e -> editAction.run());

        JButton deleteButton = new JButton("Delete " + label);
        deleteButton.addActionListener(e -> deleteSelection(table, label));

        JPanel buttonBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 12, 10));
        buttonBar.add(addButton);
        buttonBar.add(editButton);
        buttonBar.add(deleteButton);
        panel.add(buttonBar, BorderLayout.NORTH);
        return panel;
    }

    private void editTableSelection(JTable table, java.util.function.IntConsumer editor, int size) {
        int selectedRow = table.getSelectedRow();
        if (selectedRow >= 0) {
            int modelRow = table.convertRowIndexToModel(selectedRow);
            editor.accept(modelRow);
        } else {
            JOptionPane.showMessageDialog(this, "Please select a row.", "No selection", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private void deleteSelection(JTable table, String label) {
        int selectedRow = table.getSelectedRow();
        if (selectedRow >= 0) {
            int modelRow = table.convertRowIndexToModel(selectedRow);
            int choice = JOptionPane.showConfirmDialog(this, "Delete selected " + label + "?", "Confirm Delete", JOptionPane.YES_NO_OPTION);
            if (choice == JOptionPane.YES_OPTION) {
                switch (label) {
                    case "Member" -> dataStore.deleteMember(modelRow);
                    case "Contact" -> dataStore.deleteContact(modelRow);
                    case "Employment" -> dataStore.deleteEmployment(modelRow);
                    case "Previous Employment" -> dataStore.deletePreviousEmployment(modelRow);
                    case "Heir" -> dataStore.deleteHeir(modelRow);
                    case "Government ID" -> dataStore.deleteGovernmentId(modelRow);
                    case "Employer" -> dataStore.deleteEmployer(modelRow);
                }
                refreshAllTables();
            }
        } else {
            JOptionPane.showMessageDialog(this, "Please select a row.", "No selection", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private void showHelpDialog() {
        JOptionPane.showMessageDialog(this, "Use the tabs to switch between data types, and use Add/Edit/Delete to manage records.", "System Help Desk", JOptionPane.INFORMATION_MESSAGE);
    }

    private void showMemberDialog(int rowIndex) {
        JTextField idField = new JTextField();
        JTextField nameField = new JTextField();
        JTextField typeField = new JTextField();
        JTextField sexField = new JTextField();
        JTextField birthField = new JTextField();
        JTextField citizenshipField = new JTextField();

        if (rowIndex >= 0) {
            MemberRecord existing = dataStore.getMembers().get(rowIndex);
            idField.setText(existing.getPagibigId());
            nameField.setText(existing.getMemName());
            typeField.setText(existing.getMemType());
            sexField.setText(existing.getSex());
            birthField.setText(existing.getBirthDate());
            citizenshipField.setText(existing.getCitizenship());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Pagibig ID:"));
        panel.add(idField);
        panel.add(new JLabel("Member Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Membership Type:"));
        panel.add(typeField);
        panel.add(new JLabel("Sex:"));
        panel.add(sexField);
        panel.add(new JLabel("Birth Date (YYYY-MM-DD):"));
        panel.add(birthField);
        panel.add(new JLabel("Citizenship:"));
        panel.add(citizenshipField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Member" : "Edit Member", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            MemberRecord record = new MemberRecord(
                    idField.getText().trim(),
                    nameField.getText().trim(),
                    typeField.getText().trim(),
                    sexField.getText().trim(),
                    birthField.getText().trim(),
                    citizenshipField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updateMember(rowIndex, record);
            } else {
                dataStore.addMember(record);
            }
            refreshMemberTable();
        }
    }

    private void showContactDialog(int rowIndex) {
        JTextField idField = new JTextField();
        JTextField cellField = new JTextField();
        JTextField homeField = new JTextField();
        JTextField directField = new JTextField();
        JTextField trunkField = new JTextField();
        JTextField emailField = new JTextField();
        JTextField permField = new JTextField();
        JTextField presentField = new JTextField();
        JTextField preferredField = new JTextField();

        if (rowIndex >= 0) {
            ContactRecord existing = dataStore.getContacts().get(rowIndex);
            idField.setText(existing.getPagibigId());
            cellField.setText(existing.getCellNum());
            homeField.setText(existing.getHomeNum());
            directField.setText(existing.getBusinessDirect());
            trunkField.setText(existing.getBusinessTrunk());
            emailField.setText(existing.getEmailAddress());
            permField.setText(existing.getPermAddress());
            presentField.setText(existing.getPresentAddress());
            preferredField.setText(existing.getPrefMailAddress());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Pagibig ID:"));
        panel.add(idField);
        panel.add(new JLabel("Cell Number:"));
        panel.add(cellField);
        panel.add(new JLabel("Home Number:"));
        panel.add(homeField);
        panel.add(new JLabel("Business Direct:"));
        panel.add(directField);
        panel.add(new JLabel("Business Trunk:"));
        panel.add(trunkField);
        panel.add(new JLabel("Email Address:"));
        panel.add(emailField);
        panel.add(new JLabel("Permanent Address:"));
        panel.add(permField);
        panel.add(new JLabel("Present Address:"));
        panel.add(presentField);
        panel.add(new JLabel("Preferred Mail:"));
        panel.add(preferredField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Contact" : "Edit Contact", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            ContactRecord record = new ContactRecord(
                    idField.getText().trim(),
                    cellField.getText().trim(),
                    homeField.getText().trim(),
                    directField.getText().trim(),
                    trunkField.getText().trim(),
                    emailField.getText().trim(),
                    permField.getText().trim(),
                    presentField.getText().trim(),
                    preferredField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updateContact(rowIndex, record);
            } else {
                dataStore.addContact(record);
            }
            refreshContactTable();
        }
    }

    private void showEmploymentDialog(int rowIndex) {
        JTextField idField = new JTextField();
        JTextField employerField = new JTextField();
        JTextField statusField = new JTextField();
        JTextField occupationField = new JTextField();
        JTextField officeField = new JTextField();
        JTextField dateField = new JTextField();
        JTextField incomeField = new JTextField();

        if (rowIndex >= 0) {
            EmploymentRecord existing = dataStore.getEmployments().get(rowIndex);
            idField.setText(existing.getPagibigId());
            employerField.setText(existing.getEmployerId());
            statusField.setText(existing.getEmploymentStatus());
            occupationField.setText(existing.getOccupation());
            officeField.setText(existing.getOfficeAssignment());
            dateField.setText(existing.getDateEmployed());
            incomeField.setText(existing.getMonthlyIncome());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Pagibig ID:"));
        panel.add(idField);
        panel.add(new JLabel("Employer ID:"));
        panel.add(employerField);
        panel.add(new JLabel("Employment Status:"));
        panel.add(statusField);
        panel.add(new JLabel("Occupation:"));
        panel.add(occupationField);
        panel.add(new JLabel("Office Assignment:"));
        panel.add(officeField);
        panel.add(new JLabel("Date Employed:"));
        panel.add(dateField);
        panel.add(new JLabel("Monthly Income:"));
        panel.add(incomeField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Employment" : "Edit Employment", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            EmploymentRecord record = new EmploymentRecord(
                    idField.getText().trim(),
                    employerField.getText().trim(),
                    statusField.getText().trim(),
                    occupationField.getText().trim(),
                    officeField.getText().trim(),
                    dateField.getText().trim(),
                    incomeField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updateEmployment(rowIndex, record);
            } else {
                dataStore.addEmployment(record);
            }
            refreshEmploymentTable();
        }
    }

    private void showPreviousEmploymentDialog(int rowIndex) {
        JTextField idField = new JTextField();
        JTextField employerField = new JTextField();
        JTextField fromField = new JTextField();
        JTextField toField = new JTextField();
        JTextField officeField = new JTextField();

        if (rowIndex >= 0) {
            PreviousEmploymentRecord existing = dataStore.getPreviousEmployments().get(rowIndex);
            idField.setText(existing.getPagibigId());
            employerField.setText(existing.getEmployerId());
            fromField.setText(existing.getDateFrom());
            toField.setText(existing.getDateTo());
            officeField.setText(existing.getPrevOfficeAssignment());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Pagibig ID:"));
        panel.add(idField);
        panel.add(new JLabel("Employer ID:"));
        panel.add(employerField);
        panel.add(new JLabel("Date From:"));
        panel.add(fromField);
        panel.add(new JLabel("Date To:"));
        panel.add(toField);
        panel.add(new JLabel("Previous Office Assignment:"));
        panel.add(officeField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Previous Employment" : "Edit Previous Employment", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            PreviousEmploymentRecord record = new PreviousEmploymentRecord(
                    idField.getText().trim(),
                    employerField.getText().trim(),
                    fromField.getText().trim(),
                    toField.getText().trim(),
                    officeField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updatePreviousEmployment(rowIndex, record);
            } else {
                dataStore.addPreviousEmployment(record);
            }
            refreshPreviousEmploymentTable();
        }
    }

    private void showHeirDialog(int rowIndex) {
        JTextField idField = new JTextField();
        JTextField codeField = new JTextField();
        JTextField nameField = new JTextField();
        JTextField relationshipField = new JTextField();
        JTextField birthField = new JTextField();

        if (rowIndex >= 0) {
            HeirRecord existing = dataStore.getHeirs().get(rowIndex);
            idField.setText(existing.getPagibigId());
            codeField.setText(existing.getHeirCode());
            nameField.setText(existing.getHeirName());
            relationshipField.setText(existing.getRelationship());
            birthField.setText(existing.getHeirDateBirth());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Pagibig ID:"));
        panel.add(idField);
        panel.add(new JLabel("Heir Code:"));
        panel.add(codeField);
        panel.add(new JLabel("Heir Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Relationship:"));
        panel.add(relationshipField);
        panel.add(new JLabel("Birth Date:"));
        panel.add(birthField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Heir" : "Edit Heir", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            HeirRecord record = new HeirRecord(
                    idField.getText().trim(),
                    codeField.getText().trim(),
                    nameField.getText().trim(),
                    relationshipField.getText().trim(),
                    birthField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updateHeir(rowIndex, record);
            } else {
                dataStore.addHeir(record);
            }
            refreshHeirTable();
        }
    }

    private void showGovernmentIdDialog(int rowIndex) {
        JTextField idField = new JTextField();
        JTextField tinField = new JTextField();
        JTextField sssField = new JTextField();
        JTextField crnField = new JTextField();
        JTextField emField = new JTextField();
        JTextField afpField = new JTextField();
        JTextField depedField = new JTextField();

        if (rowIndex >= 0) {
            GovernmentIdRecord existing = dataStore.getGovernmentIds().get(rowIndex);
            idField.setText(existing.getPagibigId());
            tinField.setText(existing.getTinNum());
            sssField.setText(existing.getSssNum());
            crnField.setText(existing.getCrn());
            emField.setText(existing.getEmNum());
            afpField.setText(existing.getAfpPnpNum());
            depedField.setText(existing.getDepedCode());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Pagibig ID:"));
        panel.add(idField);
        panel.add(new JLabel("TIN Number:"));
        panel.add(tinField);
        panel.add(new JLabel("SSS Number:"));
        panel.add(sssField);
        panel.add(new JLabel("CRN:"));
        panel.add(crnField);
        panel.add(new JLabel("EM Number:"));
        panel.add(emField);
        panel.add(new JLabel("AFP/PNP Number:"));
        panel.add(afpField);
        panel.add(new JLabel("DepEd Code:"));
        panel.add(depedField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Government ID" : "Edit Government ID", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            GovernmentIdRecord record = new GovernmentIdRecord(
                    idField.getText().trim(),
                    tinField.getText().trim(),
                    sssField.getText().trim(),
                    crnField.getText().trim(),
                    emField.getText().trim(),
                    afpField.getText().trim(),
                    depedField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updateGovernmentId(rowIndex, record);
            } else {
                dataStore.addGovernmentId(record);
            }
            refreshGovernmentIdTable();
        }
    }

    private void showEmployerDialog(int rowIndex) {
        JTextField employerIdField = new JTextField();
        JTextField nameField = new JTextField();
        JTextField addressField = new JTextField();

        if (rowIndex >= 0) {
            EmployerRecord existing = dataStore.getEmployers().get(rowIndex);
            employerIdField.setText(existing.getEmployerId());
            nameField.setText(existing.getEmployerName());
            addressField.setText(existing.getEmployerAddress());
        }

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Employer ID:"));
        panel.add(employerIdField);
        panel.add(new JLabel("Employer Name:"));
        panel.add(nameField);
        panel.add(new JLabel("Employer Address:"));
        panel.add(addressField);

        int result = JOptionPane.showConfirmDialog(this, panel, rowIndex < 0 ? "Add Employer" : "Edit Employer", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
        if (result == JOptionPane.OK_OPTION) {
            EmployerRecord record = new EmployerRecord(
                    employerIdField.getText().trim(),
                    nameField.getText().trim(),
                    addressField.getText().trim()
            );
            if (rowIndex >= 0) {
                dataStore.updateEmployer(rowIndex, record);
            } else {
                dataStore.addEmployer(record);
            }
            refreshEmployerTable();
        }
    }

    private void refreshAllTables() {
        refreshMemberTable();
        refreshContactTable();
        refreshEmploymentTable();
        refreshPreviousEmploymentTable();
        refreshHeirTable();
        refreshGovernmentIdTable();
        refreshEmployerTable();
    }

    private void refreshMemberTable() {
        memberModel.setRowCount(0);
        for (MemberRecord member : dataStore.getMembers()) {
            memberModel.addRow(new Object[]{member.getPagibigId(), member.getMemName(), member.getMemType(), member.getSex(), member.getBirthDate(), member.getCitizenship()});
        }
        applySearchFilter();
    }

    private void refreshContactTable() {
        contactModel.setRowCount(0);
        for (ContactRecord contact : dataStore.getContacts()) {
            contactModel.addRow(new Object[]{contact.getPagibigId(), contact.getCellNum(), contact.getHomeNum(), contact.getBusinessDirect(), contact.getBusinessTrunk(), contact.getEmailAddress(), contact.getPermAddress(), contact.getPresentAddress(), contact.getPrefMailAddress()});
        }
        applySearchFilter();
    }

    private void refreshEmploymentTable() {
        employmentModel.setRowCount(0);
        for (EmploymentRecord employment : dataStore.getEmployments()) {
            employmentModel.addRow(new Object[]{employment.getPagibigId(), employment.getEmployerId(), employment.getEmploymentStatus(), employment.getOccupation(), employment.getOfficeAssignment(), employment.getDateEmployed(), employment.getMonthlyIncome()});
        }
        applySearchFilter();
    }

    private void refreshPreviousEmploymentTable() {
        previousEmploymentModel.setRowCount(0);
        for (PreviousEmploymentRecord previous : dataStore.getPreviousEmployments()) {
            previousEmploymentModel.addRow(new Object[]{previous.getPagibigId(), previous.getEmployerId(), previous.getDateFrom(), previous.getDateTo(), previous.getPrevOfficeAssignment()});
        }
        applySearchFilter();
    }

    private void refreshHeirTable() {
        heirModel.setRowCount(0);
        for (HeirRecord heir : dataStore.getHeirs()) {
            heirModel.addRow(new Object[]{heir.getPagibigId(), heir.getHeirCode(), heir.getHeirName(), heir.getRelationship(), heir.getHeirDateBirth()});
        }
        applySearchFilter();
    }

    private void refreshGovernmentIdTable() {
        governmentIdModel.setRowCount(0);
        for (GovernmentIdRecord governmentId : dataStore.getGovernmentIds()) {
            governmentIdModel.addRow(new Object[]{governmentId.getPagibigId(), governmentId.getTinNum(), governmentId.getSssNum(), governmentId.getCrn(), governmentId.getEmNum(), governmentId.getAfpPnpNum(), governmentId.getDepedCode()});
        }
        applySearchFilter();
    }

    private void refreshEmployerTable() {
        employerModel.setRowCount(0);
        for (EmployerRecord employer : dataStore.getEmployers()) {
            employerModel.addRow(new Object[]{employer.getEmployerId(), employer.getEmployerName(), employer.getEmployerAddress()});
        }
        applySearchFilter();
    }

    private void applySearchFilter() {
        String query = searchField.getText().trim();
        if (query.isEmpty()) {
            memberSorter.setRowFilter(null);
            contactSorter.setRowFilter(null);
            employmentSorter.setRowFilter(null);
            previousEmploymentSorter.setRowFilter(null);
            heirSorter.setRowFilter(null);
            governmentIdSorter.setRowFilter(null);
            employerSorter.setRowFilter(null);
            return;
        }

        RowFilter<DefaultTableModel, Object> filter = RowFilter.regexFilter("(?i)" + Pattern.quote(query));
        int selectedIndex = tabbedPane.getSelectedIndex();
        memberSorter.setRowFilter(null);
        contactSorter.setRowFilter(null);
        employmentSorter.setRowFilter(null);
        previousEmploymentSorter.setRowFilter(null);
        heirSorter.setRowFilter(null);
        governmentIdSorter.setRowFilter(null);
        employerSorter.setRowFilter(null);

        switch (selectedIndex) {
            case 0 -> memberSorter.setRowFilter(filter);
            case 1 -> contactSorter.setRowFilter(filter);
            case 2 -> employmentSorter.setRowFilter(filter);
            case 3 -> previousEmploymentSorter.setRowFilter(filter);
            case 4 -> heirSorter.setRowFilter(filter);
            case 5 -> governmentIdSorter.setRowFilter(filter);
            case 6 -> employerSorter.setRowFilter(filter);
        }
    }
}
