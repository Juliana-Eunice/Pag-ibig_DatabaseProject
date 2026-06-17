package com.pagibig;

public class EmploymentRecord {
    private String pagibigId;
    private String employerId;
    private String employmentStatus;
    private String occupation;
    private String officeAssignment;
    private String dateEmployed;
    private String monthlyIncome;

    public EmploymentRecord(String pagibigId, String employerId, String employmentStatus, String occupation, String officeAssignment, String dateEmployed, String monthlyIncome) {
        this.pagibigId = pagibigId;
        this.employerId = employerId;
        this.employmentStatus = employmentStatus;
        this.occupation = occupation;
        this.officeAssignment = officeAssignment;
        this.dateEmployed = dateEmployed;
        this.monthlyIncome = monthlyIncome;
    }

    public String getPagibigId() {
        return pagibigId;
    }

    public void setPagibigId(String pagibigId) {
        this.pagibigId = pagibigId;
    }

    public String getEmployerId() {
        return employerId;
    }

    public void setEmployerId(String employerId) {
        this.employerId = employerId;
    }

    public String getEmploymentStatus() {
        return employmentStatus;
    }

    public void setEmploymentStatus(String employmentStatus) {
        this.employmentStatus = employmentStatus;
    }

    public String getOccupation() {
        return occupation;
    }

    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }

    public String getOfficeAssignment() {
        return officeAssignment;
    }

    public void setOfficeAssignment(String officeAssignment) {
        this.officeAssignment = officeAssignment;
    }

    public String getDateEmployed() {
        return dateEmployed;
    }

    public void setDateEmployed(String dateEmployed) {
        this.dateEmployed = dateEmployed;
    }

    public String getMonthlyIncome() {
        return monthlyIncome;
    }

    public void setMonthlyIncome(String monthlyIncome) {
        this.monthlyIncome = monthlyIncome;
    }
}
