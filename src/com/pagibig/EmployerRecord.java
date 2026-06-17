package com.pagibig;

public class EmployerRecord {
    private String employerId;
    private String employerName;
    private String employerAddress;

    public EmployerRecord(String employerId, String employerName, String employerAddress) {
        this.employerId = employerId;
        this.employerName = employerName;
        this.employerAddress = employerAddress;
    }

    public String getEmployerId() {
        return employerId;
    }

    public void setEmployerId(String employerId) {
        this.employerId = employerId;
    }

    public String getEmployerName() {
        return employerName;
    }

    public void setEmployerName(String employerName) {
        this.employerName = employerName;
    }

    public String getEmployerAddress() {
        return employerAddress;
    }

    public void setEmployerAddress(String employerAddress) {
        this.employerAddress = employerAddress;
    }
}
