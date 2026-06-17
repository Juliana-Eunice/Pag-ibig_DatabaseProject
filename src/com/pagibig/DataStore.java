package com.pagibig;

import java.util.ArrayList;
import java.util.List;

public class DataStore {
    private final List<MemberRecord> members = new ArrayList<>();
    private final List<ContactRecord> contacts = new ArrayList<>();
    private final List<EmploymentRecord> employments = new ArrayList<>();
    private final List<PreviousEmploymentRecord> previousEmployments = new ArrayList<>();
    private final List<HeirRecord> heirs = new ArrayList<>();
    private final List<GovernmentIdRecord> governmentIds = new ArrayList<>();
    private final List<EmployerRecord> employers = new ArrayList<>();

    public DataStore() {
        // No initial dummy data; data starts empty.
    }

    public List<MemberRecord> getMembers() {
        return members;
    }

    public List<ContactRecord> getContacts() {
        return contacts;
    }

    public List<EmploymentRecord> getEmployments() {
        return employments;
    }

    public List<PreviousEmploymentRecord> getPreviousEmployments() {
        return previousEmployments;
    }

    public List<HeirRecord> getHeirs() {
        return heirs;
    }

    public List<GovernmentIdRecord> getGovernmentIds() {
        return governmentIds;
    }

    public List<EmployerRecord> getEmployers() {
        return employers;
    }

    public void addMember(MemberRecord member) {
        members.add(member);
    }

    public void updateMember(int index, MemberRecord member) {
        if (index >= 0 && index < members.size()) {
            members.set(index, member);
        }
    }

    public void deleteMember(int index) {
        if (index >= 0 && index < members.size()) {
            members.remove(index);
        }
    }

    public void addContact(ContactRecord contact) {
        contacts.add(contact);
    }

    public void updateContact(int index, ContactRecord contact) {
        if (index >= 0 && index < contacts.size()) {
            contacts.set(index, contact);
        }
    }

    public void deleteContact(int index) {
        if (index >= 0 && index < contacts.size()) {
            contacts.remove(index);
        }
    }

    public void addEmployment(EmploymentRecord employment) {
        employments.add(employment);
    }

    public void updateEmployment(int index, EmploymentRecord employment) {
        if (index >= 0 && index < employments.size()) {
            employments.set(index, employment);
        }
    }

    public void deleteEmployment(int index) {
        if (index >= 0 && index < employments.size()) {
            employments.remove(index);
        }
    }

    public void addPreviousEmployment(PreviousEmploymentRecord previousEmployment) {
        previousEmployments.add(previousEmployment);
    }

    public void updatePreviousEmployment(int index, PreviousEmploymentRecord previousEmployment) {
        if (index >= 0 && index < previousEmployments.size()) {
            previousEmployments.set(index, previousEmployment);
        }
    }

    public void deletePreviousEmployment(int index) {
        if (index >= 0 && index < previousEmployments.size()) {
            previousEmployments.remove(index);
        }
    }

    public void addHeir(HeirRecord heir) {
        heirs.add(heir);
    }

    public void updateHeir(int index, HeirRecord heir) {
        if (index >= 0 && index < heirs.size()) {
            heirs.set(index, heir);
        }
    }

    public void deleteHeir(int index) {
        if (index >= 0 && index < heirs.size()) {
            heirs.remove(index);
        }
    }

    public void addGovernmentId(GovernmentIdRecord governmentId) {
        governmentIds.add(governmentId);
    }

    public void updateGovernmentId(int index, GovernmentIdRecord governmentId) {
        if (index >= 0 && index < governmentIds.size()) {
            governmentIds.set(index, governmentId);
        }
    }

    public void deleteGovernmentId(int index) {
        if (index >= 0 && index < governmentIds.size()) {
            governmentIds.remove(index);
        }
    }

    public void addEmployer(EmployerRecord employer) {
        employers.add(employer);
    }

    public void updateEmployer(int index, EmployerRecord employer) {
        if (index >= 0 && index < employers.size()) {
            employers.set(index, employer);
        }
    }

    public void deleteEmployer(int index) {
        if (index >= 0 && index < employers.size()) {
            employers.remove(index);
        }
    }
}
